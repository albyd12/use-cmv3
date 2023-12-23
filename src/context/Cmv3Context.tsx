import { createContext, useContext } from 'react'
import { Phase } from '../types/phase'
import { CandyGuard, CandyMachine } from '@metaplex-foundation/mpl-candy-machine'

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
}

export const Cmv3Context = createContext<Cmv3ContextData | undefined>(undefined)

export const useCmv3 = (): Cmv3ContextData => {
  const cmv3 = useContext(Cmv3Context)
  if (!cmv3) {
    throw new Error('useCmv3 must be used within a Cmv3Provider')
  }
  return cmv3
}
