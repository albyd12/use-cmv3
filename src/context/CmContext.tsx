import { createContext, useContext } from 'react'
import { Phase } from '../types/phase'
import { CandyGuard, CandyMachine } from '@metaplex-foundation/mpl-candy-machine'

export interface CmContextData {
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

export const CmContext = createContext<CmContextData | undefined>(undefined)

export const useCm = (): CmContextData => {
  const cm = useContext(CmContext)
  if (!cm) {
    throw Error('useCm must be used within a CmProvider')
  }
  return cm
}
