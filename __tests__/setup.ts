import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: null,
    isConnected: false,
    connector: null,
  })),
  useConnect: vi.fn(() => ({
    connect: vi.fn(),
    connectors: [],
    isPending: false,
    error: null,
  })),
  useDisconnect: vi.fn(() => ({
    disconnect: vi.fn(),
  })),
  useConnectorClient: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  createConfig: vi.fn(),
  createPublicClient: vi.fn(),
  http: vi.fn(),
}))

// Mock viem
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getEnsName: vi.fn(),
      getEnsAddress: vi.fn(),
    })),
    http: vi.fn(),
  }
})

// Mock window.btc (Bitcoin wallet)
Object.defineProperty(window, 'btc', {
  writable: true,
  value: null,
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url')
global.URL.revokeObjectURL = vi.fn()

// Mock window.alert and window.confirm
global.window.alert = vi.fn()
global.window.confirm = vi.fn(() => true)

// Mock document.createElement for download functionality
const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    const anchor = originalCreateElement.call(document, 'a') as HTMLAnchorElement
    anchor.click = vi.fn()
    return anchor
  }
  return originalCreateElement.call(document, tagName)
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})

