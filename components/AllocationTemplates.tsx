'use client'

import { Beneficiary } from '@/types'

interface AllocationTemplate {
  id: string
  name: string
  description: string
  apply: (beneficiaries: Beneficiary[]) => Record<string, number>
}

const templates: AllocationTemplate[] = [
  {
    id: 'equal',
    name: 'Equal Split',
    description: 'Split all assets equally among all beneficiaries',
    apply: (beneficiaries) => {
      const percentage = 100 / beneficiaries.length
      const allocations: Record<string, number> = {}
      beneficiaries.forEach(ben => {
        allocations[ben.id] = percentage
      })
      return allocations
    },
  },
  {
    id: 'first-gets-all',
    name: 'First Beneficiary Gets All',
    description: 'Give 100% to the first beneficiary',
    apply: (beneficiaries) => {
      if (beneficiaries.length === 0) return {}
      return { [beneficiaries[0].id]: 100 }
    },
  },
  {
    id: 'weighted',
    name: 'Weighted Split',
    description: 'Split 50% to first, 30% to second, 20% to third, etc.',
    apply: (beneficiaries) => {
      const weights = [50, 30, 20, 10, 5, 5, 5, 5, 5, 5] // Up to 10 beneficiaries
      const allocations: Record<string, number> = {}
      beneficiaries.forEach((ben, index) => {
        allocations[ben.id] = weights[index] || 0
      })
      return allocations
    },
  },
]

interface AllocationTemplatesProps {
  beneficiaries: Beneficiary[]
  onApplyTemplate: (allocations: Record<string, number>) => void
}

export function AllocationTemplates({ beneficiaries, onApplyTemplate }: AllocationTemplatesProps) {
  if (beneficiaries.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          Add beneficiaries first to use allocation templates
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-gray-900">Quick Allocation Templates</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => {
              const allocations = template.apply(beneficiaries)
              onApplyTemplate(allocations)
            }}
            className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
          >
            <h5 className="font-semibold text-gray-900 mb-1">{template.name}</h5>
            <p className="text-xs text-gray-600">{template.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

