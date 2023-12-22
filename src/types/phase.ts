export type Payment = {
  basisPoints: number
  decimals: number
  identifier: string
}

export type Phase = {
  label: string
  errors: string[]
  payments: Payment[]
  startsAt?: number
  endsAt?: number
  mintLismit?: number
}
