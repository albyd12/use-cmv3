import { Some, Umi, publicKey } from '@metaplex-foundation/umi'
import { AllowLists } from '../types/metadata'
import {
  CandyMachine,
  GuardSet,
  MintLimit,
  safeFetchMintCounterFromSeeds,
} from '@metaplex-foundation/mpl-candy-machine'

export const allowlistChecker = (allowLists: AllowLists, umi: Umi, guardlabel: string) => {
  if (!allowLists.has(guardlabel)) {
    console.error(`Allowlist for guard "${guardlabel}" has not been configured`)
    return false
  }
  if (!allowLists.get(guardlabel)?.includes(publicKey(umi.identity.publicKey))) {
    return false
  }
  return true
}

export const mintLimitChecker = async (
  umi: Umi,
  candyMachine: CandyMachine,
  group: {
    label: string
    guards: GuardSet
  },
) => {
  const mintLimit = group.guards.mintLimit as Some<MintLimit>
  try {
    const mintCounter = await safeFetchMintCounterFromSeeds(umi, {
      id: mintLimit.value.id,
      user: umi.identity.publicKey,
      candyMachine: candyMachine.publicKey,
      candyGuard: candyMachine.mintAuthority,
    })
    if (mintCounter) {
      return mintLimit.value.limit - mintCounter.count
    } else {
      return mintLimit.value.limit
    }
  } catch (error) {
    console.error(`mintLimitChecker: ${error}`)
    return 0
  }
}

export const calculateMintable = (mintableAmount: number, newAmount: number) => {
  if (mintableAmount > newAmount) {
    mintableAmount = newAmount
  }
  return mintableAmount
}
