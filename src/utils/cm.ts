import {
  CandyGuard,
  CandyMachine,
  fetchCandyMachine,
  safeFetchCandyGuard,
} from '@metaplex-foundation/mpl-candy-machine'
import { Umi, publicKey } from '@metaplex-foundation/umi'

export const validateCandyMachine = async (
  umi: Umi,
  candyMachineId: string,
): Promise<{ candyMachine: CandyMachine; candyGuard: CandyGuard } | null> => {
  let candyMachine

  try {
    candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineId))
  } catch (error) {
    console.error(error)
    console.warn('No candy machine found')
  }

  if (!candyMachine) return null

  let candyGuard

  try {
    candyGuard = await safeFetchCandyGuard(umi, candyMachine.mintAuthority)
  } catch (error) {
    console.error(error)
    console.warn('No candy guard found')
  }

  if (!candyGuard) return null

  return { candyMachine, candyGuard }
}
