// ARIA live region announcements for screen readers

let liveRegion: HTMLDivElement | null = null

function getLiveRegion(): HTMLDivElement {
  if (!liveRegion) {
    liveRegion = document.createElement('div')
    liveRegion.setAttribute('role', 'status')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    document.body.appendChild(liveRegion)
  }
  return liveRegion
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const region = getLiveRegion()
  region.setAttribute('aria-live', priority)
  region.textContent = message
  
  // Clear after announcement is read
  setTimeout(() => {
    region.textContent = ''
  }, 1000)
}

export function announceError(message: string) {
  announce(message, 'assertive')
}

export function announceSuccess(message: string) {
  announce(message, 'polite')
}

