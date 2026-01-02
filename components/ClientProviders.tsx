'use client'

import React from 'react'
import { Providers } from '@/app/providers'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}

