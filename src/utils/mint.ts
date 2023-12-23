import {
  CandyMachine,
  GuardGroup,
  DefaultGuardSet,
  DefaultGuardSetMintArgs,
  getMerkleRoot,
  route,
  getMerkleProof,
  safeFetchAllowListProofFromSeeds,
} from '@metaplex-foundation/mpl-candy-machine'
import {
  some,
  Umi,
  transactionBuilder,
  publicKey,
  TransactionBuilder,
  none,
  AddressLookupTableInput,
} from '@metaplex-foundation/umi'
import { fetchAddressLookupTable } from '@metaplex-foundation/mpl-toolbox'
import { AllowLists } from '../types/metadata'

export const mintArgsBuilder = (
  candyMachine: CandyMachine,
  guardToUse: GuardGroup<DefaultGuardSet>,
  allowLists?: AllowLists,
): Partial<DefaultGuardSetMintArgs> => {
  const guards = guardToUse.guards
  let ruleset = undefined
  if (candyMachine.ruleSet.__option === 'Some') {
    ruleset = candyMachine.ruleSet.value
  }

  const mintArgs: Partial<DefaultGuardSetMintArgs> = {}
  if (guards.allocation.__option === 'Some') {
    mintArgs.allocation = some({ id: guards.allocation.value.id })
  }

  if (guards.allowList.__option === 'Some') {
    const allowlist = allowLists!.get(guardToUse.label)
    if (!allowlist) {
      console.error(`allowlist for guard ${guardToUse.label} not found!`)
    } else {
      mintArgs.allowList = some({ merkleRoot: getMerkleRoot(allowlist) })
    }
  }

  if (guards.freezeSolPayment.__option === 'Some') {
    mintArgs.freezeSolPayment = some({
      destination: guards.freezeSolPayment.value.destination,
    })
  }

  if (guards.freezeTokenPayment.__option === 'Some') {
    mintArgs.freezeTokenPayment = some({
      destinationAta: guards.freezeTokenPayment.value.destinationAta,
      mint: guards.freezeTokenPayment.value.mint,
      nftRuleSet: ruleset,
    })
  }

  if (guards.gatekeeper.__option === 'Some') {
    mintArgs.gatekeeper = some({
      expireOnUse: guards.gatekeeper.value.expireOnUse,
      gatekeeperNetwork: guards.gatekeeper.value.gatekeeperNetwork,
    })
  }

  if (guards.mintLimit.__option === 'Some') {
    mintArgs.mintLimit = some({ id: guards.mintLimit.value.id })
  }

  if (guards.solPayment.__option === 'Some') {
    mintArgs.solPayment = some({
      destination: guards.solPayment.value.destination,
    })
  }

  if (guards.thirdPartySigner.__option === 'Some') {
    console.error('not supported. you need a backend')
  }

  if (guards.token2022Payment.__option === 'Some') {
    mintArgs.token2022Payment = some({
      destinationAta: guards.token2022Payment.value.destinationAta,
      mint: guards.token2022Payment.value.mint,
    })
  }

  if (guards.tokenBurn.__option === 'Some') {
    mintArgs.tokenBurn = some({ mint: guards.tokenBurn.value.mint })
  }

  if (guards.tokenGate.__option === 'Some') {
    mintArgs.tokenGate = some({ mint: guards.tokenGate.value.mint })
  }

  if (guards.tokenPayment.__option === 'Some') {
    mintArgs.tokenPayment = some({
      destinationAta: guards.tokenPayment.value.destinationAta,
      mint: guards.tokenPayment.value.mint,
    })
  }
  return mintArgs
}

export const routeBuilder = async (
  umi: Umi,
  guardToUse: GuardGroup<DefaultGuardSet>,
  candyMachine: CandyMachine,
  allowLists: AllowLists,
): Promise<TransactionBuilder | undefined> => {
  let tx2 = transactionBuilder()

  if (guardToUse.guards.allowList.__option === 'Some') {
    const allowlist = allowLists.get(guardToUse.label)
    if (!allowlist) {
      console.error('allowlist not found!')
      return transactionBuilder()
    }
    const allowListProof = await safeFetchAllowListProofFromSeeds(umi, {
      candyGuard: candyMachine.mintAuthority,
      candyMachine: candyMachine.publicKey,
      merkleRoot: getMerkleRoot(allowlist),
      user: publicKey(umi.identity),
    })
    if (allowListProof === null) {
      tx2 = tx2.add(
        route(umi, {
          guard: 'allowList',
          candyMachine: candyMachine.publicKey,
          candyGuard: candyMachine.mintAuthority,
          group: guardToUse.label === 'default' ? none() : some(guardToUse.label),
          routeArgs: {
            path: 'proof',
            merkleRoot: getMerkleRoot(allowlist),
            merkleProof: getMerkleProof(allowlist, publicKey(umi.identity)),
          },
        }),
      )
    }
    return tx2
  }
}

export const combineTransactions = async (
  umi: Umi,
  txs: TransactionBuilder[],
  lut?: string,
): Promise<TransactionBuilder[]> => {
  const returnArray: TransactionBuilder[] = []
  let builder = transactionBuilder()
  // combine as many transactions as possible into one
  for (let i = 0; i <= txs.length - 1; i++) {
    const tx = txs[i]
    let oldBuilder = builder
    builder = builder.add(tx)
    let tables: AddressLookupTableInput[] = []
    if (lut) {
      const lutPubKey = publicKey(lut)
      const fetchedLut = await fetchAddressLookupTable(umi, lutPubKey)
      tables = [fetchedLut]
      builder = builder.setAddressLookupTables(tables)
    } else {
      console.log('You should setup an LUT')
    }
    if (!builder.fitsInOneTransaction(umi)) {
      oldBuilder = oldBuilder.setAddressLookupTables(tables)
      returnArray.push(oldBuilder)
      builder = new TransactionBuilder()
      builder = builder.add(tx)
    }
    if (i === txs.length - 1) {
      returnArray.push(builder)
    }
  }
  return returnArray
}
