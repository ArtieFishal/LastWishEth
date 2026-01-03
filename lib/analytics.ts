// Analytics utilities - non-blocking, privacy-friendly

interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
}

class Analytics {
  private enabled: boolean = true

  track(event: AnalyticsEvent) {
    if (!this.enabled || typeof window === 'undefined') return

    try {
      // Non-blocking analytics
      // You can integrate with your preferred analytics service here
      console.log('[Analytics]', event.name, event.properties)
      
      // Example: Send to webhook or analytics service
      // fetch('/api/analytics', {
      //   method: 'POST',
      //   body: JSON.stringify(event),
      // }).catch(() => {}) // Fail silently
    } catch (error) {
      // Fail silently - analytics should never break the app
      console.error('Analytics error:', error)
    }
  }

  trackStepChange(step: string) {
    this.track({ name: 'step_change', properties: { step } })
  }

  trackWalletConnect(walletType: string) {
    this.track({ name: 'wallet_connect', properties: { walletType } })
  }

  trackAssetLoad(assetCount: number) {
    this.track({ name: 'assets_loaded', properties: { count: assetCount } })
  }

  trackPDFGeneration() {
    this.track({ name: 'pdf_generated' })
  }

  trackError(error: string, context?: string) {
    this.track({ name: 'error', properties: { error, context } })
  }

  disable() {
    this.enabled = false
  }

  enable() {
    this.enabled = true
  }
}

export const analytics = new Analytics()

