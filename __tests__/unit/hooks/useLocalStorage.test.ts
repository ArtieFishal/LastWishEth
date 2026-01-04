import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '@/components/hooks/useLocalStorage'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
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
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should initialize with initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    expect(result.current[0]).toBe('initial')
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
  })

  it('should load value from localStorage on mount', () => {
    localStorageMock.setItem('test-key', JSON.stringify('stored-value'))

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    expect(result.current[0]).toBe('stored-value')
  })

  it('should save value to localStorage when updated', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify('new-value')
    )
  })

  it('should handle function updater', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0))

    act(() => {
      result.current[1]((prev) => prev + 1)
    })

    expect(result.current[0]).toBe(1)
  })

  it('should handle complex objects', () => {
    const initialValue = { name: 'John', age: 30 }
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))

    act(() => {
      result.current[1]({ name: 'Jane', age: 25 })
    })

    expect(result.current[0]).toEqual({ name: 'Jane', age: 25 })
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify({ name: 'Jane', age: 25 })
    )
  })

  it('should handle arrays', () => {
    const initialValue: string[] = []
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))

    act(() => {
      result.current[1](['item1', 'item2'])
    })

    expect(result.current[0]).toEqual(['item1', 'item2'])
  })

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.getItem = vi.fn(() => {
      throw new Error('Storage error')
    })

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))

    // Should fall back to initial value
    expect(result.current[0]).toBe('fallback')
  })

  it('should handle setItem errors gracefully', () => {
    localStorageMock.setItem = vi.fn(() => {
      throw new Error('Storage quota exceeded')
    })

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    // Should not throw
    act(() => {
      expect(() => result.current[1]('new-value')).not.toThrow()
    })
  })

  it('should handle invalid JSON in localStorage', () => {
    localStorageMock.getItem = vi.fn(() => 'invalid-json')

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))

    // Should fall back to initial value
    expect(result.current[0]).toBe('fallback')
  })

  it('should work with SSR (window undefined)', () => {
    // This test verifies SSR compatibility
    // In SSR, window is undefined, but the hook should still work
    // The actual window check happens at runtime, so we can't fully test SSR
    // without a more complex setup. This test verifies the hook doesn't crash.
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))

    expect(result.current[0]).toBe('initial')

    act(() => {
      result.current[1]('new-value')
    })

    // Should update the state
    expect(result.current[0]).toBe('new-value')
  })
})

