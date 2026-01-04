import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ensCache } from '@/lib/cache/ensCache'

// Mock localStorage with proper store management
let store: Record<string, string> = {}

// Create a Proxy to make Object.keys() work with our store
const localStorageMock = new Proxy(
  {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  },
  {
    ownKeys: () => Reflect.ownKeys(store),
    getOwnPropertyDescriptor: (target, prop) => {
      if (typeof prop === 'string' && prop in store) {
        return {
          enumerable: true,
          configurable: true,
          value: store[prop],
        }
      }
      return Reflect.getOwnPropertyDescriptor(target, prop)
    },
  }
)

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

describe('ENSCache', () => {
  beforeEach(() => {
    // Clear the actual store
    store = {}
    // Clear the cache
    ensCache.clear()
    // Reset mocks
    vi.clearAllMocks()
    // Restore original localStorage methods
    localStorageMock.getItem.mockImplementation((key: string) => store[key] || null)
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      store[key] = value.toString()
    })
    localStorageMock.removeItem.mockImplementation((key: string) => {
      delete store[key]
    })
    localStorageMock.clear.mockImplementation(() => {
      store = {}
    })
  })

  it('should set and get ENS name', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const ensName = 'test.eth'

    ensCache.set(address, ensName)
    const result = ensCache.get(address)

    expect(result).toBe(ensName)
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('should return null for non-existent address', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const result = ensCache.get(address)

    expect(result).toBeNull()
  })

  it('should normalize address to lowercase', () => {
    const address = '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD'
    const ensName = 'test.eth'

    ensCache.set(address, ensName)
    const result = ensCache.get(address.toLowerCase())

    expect(result).toBe(ensName)
  })

  it('should handle null ENS name', () => {
    const address = '0x1234567890123456789012345678901234567890'

    ensCache.set(address, null)
    const result = ensCache.get(address)

    expect(result).toBeNull()
  })

  it('should delete cached entry', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const ensName = 'test.eth'

    ensCache.set(address, ensName)
    ensCache.delete(address)
    const result = ensCache.get(address)

    expect(result).toBeNull()
    expect(localStorageMock.removeItem).toHaveBeenCalled()
  })

  it('should clear all cached entries', () => {
    // Set up keys in store to simulate cached entries
    store['lastwish_ens_0x111'] = JSON.stringify({
      address: '0x111',
      ensName: 'test1.eth',
      timestamp: Date.now(),
    })
    store['lastwish_ens_0x222'] = JSON.stringify({
      address: '0x222',
      ensName: 'test2.eth',
      timestamp: Date.now(),
    })
    store['lastwish_ens_0x333'] = JSON.stringify({
      address: '0x333',
      ensName: 'test3.eth',
      timestamp: Date.now(),
    })

    // Verify they exist
    expect(ensCache.get('0x111')).toBe('test1.eth')
    expect(ensCache.get('0x222')).toBe('test2.eth')
    expect(ensCache.get('0x333')).toBe('test3.eth')

    // Clear cache
    ensCache.clear()

    // Verify they're gone
    expect(ensCache.get('0x111')).toBeNull()
    expect(ensCache.get('0x222')).toBeNull()
    expect(ensCache.get('0x333')).toBeNull()
  })

  it('should handle expired cache entries', () => {
    const address = '0x1234567890123456789012345678901234567890'
    const ensName = 'test.eth'

    // Set cache with old timestamp
    const oldData = {
      address: address.toLowerCase(),
      ensName,
      timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
    }
    localStorageMock.setItem(`lastwish_ens_${address.toLowerCase()}`, JSON.stringify(oldData))

    const result = ensCache.get(address)

    expect(result).toBeNull()
    expect(localStorageMock.removeItem).toHaveBeenCalled()
  })

  it('should handle localStorage errors gracefully', () => {
    const address = '0x1234567890123456789012345678901234567890'
    
    // Mock localStorage.getItem to throw error
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('Storage error')
    })

    // Should not throw
    expect(() => ensCache.get(address)).not.toThrow()
    expect(ensCache.get(address)).toBeNull()
  })
})

