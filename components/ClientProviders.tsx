'use client'

import React from 'react'
import { Providers } from '@/app/providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Providers>{children}</Providers>
    </ErrorBoundary>
  )
}

