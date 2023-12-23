import { CandyGuard, CandyMachine } from '@metaplex-foundation/mpl-candy-machine'
import { Umi } from '@metaplex-foundation/umi'
import { allowlistChecker, mintLimitChecker } from './checker'
import { AllowLists } from '../types/metadata'
import { Payment, Phase } from '../types/phase'

export const refreshPhaseTime = (phase: Phase): Phase => {
  const refreshdPhase: Phase = { ...phase }

  if (phase.startsAt && Date.now() > phase.startsAt) {
    refreshdPhase.errors = refreshdPhase.errors.filter((error) => error !== 'Phase not commenced')
  }

  if (phase.endsAt && Date.now() > phase.endsAt) {
    if (!refreshdPhase.errors.includes('Phase concluded')) {
      refreshdPhase.errors.push('Phase concluded')
    }
  }

  return refreshdPhase
}

export const getMintPhases = async (
  umi: Umi,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  allowLists?: AllowLists,
): Promise<Phase[]> => {
  //creates a map of all phases (guards) releative to the current user

  console.log('Fetching phases for wallet:', umi.identity.publicKey.toString())

  const relativePhases = await Promise.all(
    candyGuard.groups.map(async (group) => {
      const solBalance = await umi.rpc.getBalance(umi.identity.publicKey)

      const errors: string[] = []

      const payments: Payment[] = []

      let endDate: number | undefined = undefined
      let startDate: number | undefined = undefined

      //address based guards
      if (group.guards.allowList.__option == 'Some') {
        if (!allowLists || !allowlistChecker(allowLists, umi, group.label)) {
          errors.push('Address not allowed in phase')
        }
      }

      if (group.guards.mintLimit.__option === 'Some') {
        const amount = await mintLimitChecker(umi, candyMachine, group)
        if (amount < 1) {
          errors.push('Mint limit reached')
        }
      }

      //time based guards - these are static defaults which will be overrrdidden further down.
      if (group.guards.startDate.__option === 'Some') {
        startDate = Number(group.guards.startDate.value.date) * 1000
        if (Date.now() < startDate) {
          errors.push('Phase not commenced')
        }
      }

      if (group.guards.endDate.__option === 'Some') {
        endDate = Number(group.guards.endDate.value.date) * 1000
        if (Date.now() > endDate) {
          errors.push('Phase concluded')
        }
      }

      //payments
      if (group.guards.solPayment.__option === 'Some') {
        const payment = group.guards.solPayment.value.lamports
        payments.push({
          identifier: payment.identifier,
          decimals: Number(payment.decimals),
          basisPoints: Number(payment.basisPoints),
        })
        if (Number(solBalance.basisPoints) < Number(payment.basisPoints)) {
          errors.push('Not enough funds')
        }
      }

      return {
        label: group.label,
        errors: errors,

        payments: payments,

        startsAt: startDate,
        endsAt: endDate,
      }
    }),
  )

  return relativePhases
}
