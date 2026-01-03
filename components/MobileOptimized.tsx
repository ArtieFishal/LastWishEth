'use client'

import { ReactNode } from 'react'

interface MobileOptimizedProps {
  children: ReactNode
  mobileView?: ReactNode
  className?: string
}

export function MobileOptimized({ children, mobileView, className = '' }: MobileOptimizedProps) {
  return (
    <>
      {/* Desktop view */}
      <div className={`hidden md:block ${className}`}>
        {children}
      </div>
      {/* Mobile view */}
      <div className={`md:hidden ${className}`}>
        {mobileView || children}
      </div>
    </>
  )
}

