'use client'

import React from 'react'
import { Providers } from '@/app/providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SolanaProvider } from '@/components/SolanaProvider'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Providers>
        <SolanaProvider>
          {children}
        </SolanaProvider>
      </Providers>
    </ErrorBoundary>
  )
}

