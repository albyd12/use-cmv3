import React from 'react'
import { ReactNode, useEffect, useState } from 'react'
import { Phase } from '../types/phase'
import { CmContext, CmContextData } from './CmContext'
import { createUmiWithSigners } from '../utils/umi'
import { useWallet } from '@solana/wallet-adapter-react'
import { validateCandyMachine } from '../utils/cm'
import { AllowLists } from '../types/metadata'
import { CandyGuard, CandyMachine, mintV2 } from '@metaplex-foundation/mpl-candy-machine'
import { TransactionWithMeta, Umi, generateSigner, none, some, transactionBuilder } from '@metaplex-foundation/umi'
import { getMintPhases, refreshPhaseTime } from '../utils/phases'
import { combineTransactions, mintArgsBuilder, routeBuilder } from '../utils/mint'
import { setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox'
import { fetchNft } from '../utils/nft'
import { JsonMetadata } from '@metaplex-foundation/mpl-token-metadata'

interface CmProviderProps {
  config: {
    candyMachineId?: string
    candyMachineLUT?: string
    endpoint: string
  }

  metadata?: {
    allowLists?: AllowLists
    phases?: {
      label: string
      title: string
    }[]
  }

  children: ReactNode
}

export const CmProvider: React.FC<CmProviderProps> = ({ config, children, metadata }) => {
  const wallet = useWallet()

  const [umi, setUmi] = useState<Umi>(createUmiWithSigners(config.endpoint, wallet))

  const [candyMachine, setCandyMachine] = useState<CandyMachine | undefined>(undefined)
  const [candyGuard, setCandyGuard] = useState<CandyGuard | undefined>(undefined)
  const [phases, setPhases] = useState<Phase[]>([])

  const [mintCounter, setMintCounter] = useState<[number, number]>([0, 0])

  const [phasesLoading, setPhasesLoading] = useState<boolean>(true)
  const [candyMachineLoading, setCandyMachineLoading] = useState<boolean>(true)

  const [minting, setMinting] = useState<string | false>(false)
  const [mints, setMints] = useState<{ mint: string; metadata: JsonMetadata | undefined }[]>([])

  useEffect(() => {
    const initializeCandyMachineContext = async () => {
      if (!config.candyMachineId) {
        throw Error('Candy machine ID has not been configured')
      }
      if (!config.endpoint) {
        throw Error('No RPC configured')
      }
      if (!config.candyMachineLUT) {
        console.warn('No LUT has been configured, it is highly recomended you create one.')
      }

      const validatedCandyMachine = await validateCandyMachine(umi, config.candyMachineId)

      if (validatedCandyMachine == null) {
        console.warn('Invalid Candy Machine')
        return null
      }

      const staticPhases = await getMintPhases(
        umi,
        validatedCandyMachine.candyMachine,
        validatedCandyMachine.candyGuard,
        metadata?.allowLists,
      )

      if (staticPhases.length < 1) {
        console.warn('No phases found')
      }

      setPhases(staticPhases)
      setCandyMachine(validatedCandyMachine.candyMachine)
      setCandyGuard(validatedCandyMachine.candyGuard)

      setMintCounter([
        Number(validatedCandyMachine.candyMachine.itemsRedeemed),
        Number(validatedCandyMachine.candyMachine.itemsLoaded),
      ])
    }
    setMinting(false)
    setPhasesLoading(true)
    initializeCandyMachineContext()
  }, [umi, config.candyMachineLUT, config.endpoint, config.candyMachineId, metadata?.allowLists])

  useEffect(() => {
    if (!wallet.connected && umi.identity.publicKey.toString() == '11111111111111111111111111111111') return
    setUmi(createUmiWithSigners(config.endpoint, wallet))
  }, [wallet.connected, config.endpoint, umi.identity.publicKey, wallet])

  const [timeouts, setTimeouts] = useState<Record<number, NodeJS.Timeout>>({})

  const updatePhase = (phaseLabel: string) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) => {
        if (phase.label === phaseLabel) {
          const refreshedPhase = refreshPhaseTime(phase)
          return refreshedPhase
        }
        return phase
      }),
    )
  }

  useEffect(() => {
    const newTimeouts: Record<number, NodeJS.Timeout> = {}
    phases.forEach((phase) => {
      if (phase.startsAt !== undefined) {
        if (phase.startsAt > Date.now()) {
          newTimeouts[phase.startsAt] = setTimeout(
            () => {
              updatePhase(phase.label)
            },
            phase.startsAt - Date.now() + 2,
          )
          if (timeouts[phase.startsAt]) {
            clearTimeout(timeouts[phase.startsAt])
          }
        }
      }
    })

    setTimeouts((prevTimeouts) => ({ ...prevTimeouts, ...newTimeouts }))

    setPhasesLoading(false)

    return () => {
      Object.values(newTimeouts).forEach((timeoutId) => clearTimeout(timeoutId))
    }
  }, [phases, timeouts])

  useEffect(() => {
    setCandyMachineLoading(false)
  }, [candyMachine])

  useEffect(() => {
    if (!candyMachine || !umi) return
    if (mints.length > 0) {
      alert(`Minted: ${mints[mints.length - 1]}`)
    }
    setMinting(false)
    setMintCounter((mintCounter) => [mintCounter[0] - 1, mintCounter[1]])
  }, [mints, candyMachine, umi])

  const initiateMint = async (label: string) => {
    if (!wallet.connected) {
      throw Error('Wallet needs to be connected to mint')
    }

    if (!candyGuard || !candyMachine) {
      throw Error('Trying to mint without initialization')
    }

    if (!config.candyMachineLUT) {
      throw Error('It is highly reccomended you create a LUT')
    }

    try {
      const group = candyGuard.groups.filter((group) => group.label === label)[0]

      if (!group) throw Error('Phase not found')

      if (group.guards.allowList.__option == 'Some' && !metadata?.allowLists?.get(group.label)) {
        throw Error('Allowlist for phase not found in metadata')
      }

      setMinting(group.label)

      let routeBuild = await routeBuilder(umi, group, candyMachine, metadata!.allowLists!)
      if (!routeBuild) {
        routeBuild = transactionBuilder()
      }

      const nftMint = generateSigner(umi)

      const mintArgs = mintArgsBuilder(candyMachine, group, metadata?.allowLists)

      const tx = transactionBuilder().add(
        mintV2(umi, {
          candyMachine: candyMachine.publicKey,
          collectionMint: candyMachine.collectionMint,
          collectionUpdateAuthority: candyMachine.authority,
          nftMint,
          group: group.label == 'default' ? none() : some(group.label),
          candyGuard: candyGuard.publicKey,
          mintArgs,
          tokenStandard: candyMachine.tokenStandard,
        }),
      )

      const groupedTx = await combineTransactions(umi, [routeBuild, tx], config.candyMachineLUT)

      let lastSignature: Uint8Array | undefined

      if (groupedTx.length > 1) {
        for (let tx of groupedTx) {
          tx = tx.prepend(setComputeUnitLimit(umi, { units: 800_000 }))
          const { signature } = await tx.sendAndConfirm(umi, {
            confirm: { commitment: 'processed' },
            send: {
              skipPreflight: true,
            },
          })
          lastSignature = signature
        }
      } else {
        const tx = groupedTx[0].prepend(setComputeUnitLimit(umi, { units: 800_000 }))
        const { signature } = await tx.sendAndConfirm(umi, {
          confirm: { commitment: 'processed' },
          send: {
            skipPreflight: true,
          },
        })
        lastSignature = signature
      }

      if (!lastSignature) {
        setMinting(false)
        throw Error('No transaction was created')
      }

      let transaction: TransactionWithMeta | null = null

      for (let i = 0; i < 30; i++) {
        transaction = await umi.rpc.getTransaction(lastSignature)
        if (transaction) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      if (transaction === null) {
        setMinting(false)
        throw Error(`No transaction on chain for ${lastSignature}`)
      }

      const fetchedNft = await fetchNft(umi, nftMint.publicKey)
      if (fetchedNft.digitalAsset && fetchedNft.jsonMetadata) {
        setMints((mints) => [
          ...mints,
          {
            mint: nftMint.publicKey.toString(),
            metadata: fetchedNft.jsonMetadata,
          },
        ])
      }
    } catch (error) {
      setMinting(false)
      console.error('Failed to mint due to error', error)
    }
  }

  const contextValue: CmContextData = {
    minting: minting,
    loading: {
      phases: phasesLoading,
      candyMachine: candyMachineLoading,
    },
    candyMachine: candyMachine,
    candyGuard: candyGuard,
    phases,
    mintCounter: {
      sold: mintCounter[0],
      supply: mintCounter[1],
    },
    mint: initiateMint,
  }

  return <CmContext.Provider value={contextValue}>{children}</CmContext.Provider>
}
