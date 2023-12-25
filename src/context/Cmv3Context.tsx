import { createContext, useContext } from 'react'
import { Phase } from '../types/phase'
import { CandyGuard, CandyMachine } from '@metaplex-foundation/mpl-candy-machine'
import { WalletContext } from '@solana/wallet-adapter-react'
import { JsonMetadata } from '@metaplex-foundation/mpl-token-metadata'

export interface Cmv3ContextData {
  loading: {
    candyMachine: boolean
    phases: boolean
  }
  candyMachine?: CandyMachine
  candyGuard?: CandyGuard
  phases: Phase[]
  mintCounter: {
    supply: number
    sold: number
  }
  minting: string | false
  mint: (label: string) => Promise<void>
  mints: { mint: string; metadata: JsonMetadata | undefined }[]
}

export const Cmv3Context = createContext<Cmv3ContextData | undefined>(undefined)

export const useCmv3 = (): Cmv3ContextData => {
  const cmv3 = useContext(Cmv3Context)
  const wallet = useContext(WalletContext)

  if (!wallet) {
    throw new Error('Must be used within a WalletProvider')
  }

  if (!cmv3) {
    throw new Error('Must be used within a Cmv3Provider')
  }
  return cmv3
}
