export type Step = 'connect' | 'assets' | 'allocate' | 'details' | 'payment' | 'download'

export const steps: Array<{ id: Step; label: string; number: number }> = [
  { id: 'connect', label: 'Connect', number: 1 },
  { id: 'assets', label: 'Assets', number: 2 },
  { id: 'allocate', label: 'Allocate', number: 3 },
  { id: 'details', label: 'Details', number: 4 },
  { id: 'payment', label: 'Payment', number: 5 },
  { id: 'download', label: 'View', number: 6 },
]
