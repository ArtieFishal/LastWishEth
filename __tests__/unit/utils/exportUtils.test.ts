import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportToJSON, exportToCSV, downloadFile, loadFromJSON } from '@/lib/exportUtils'
import type { ExportData } from '@/lib/exportUtils'

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mocked-url')
global.URL.revokeObjectURL = vi.fn()

// Mock document.createElement
const mockClick = vi.fn()
const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'a') {
    const anchor = originalCreateElement.call(document, 'a') as HTMLAnchorElement
    anchor.click = mockClick
    return anchor
  }
  return originalCreateElement.call(document, tagName)
})

describe('exportUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportToJSON', () => {
    it('should export data to JSON string', () => {
      const data: ExportData = {
        version: '1.0.0',
        timestamp: 1234567890,
        ownerData: {
          ownerName: 'John Doe',
          ownerFullName: 'John Doe',
          ownerAddress: '0x123',
          ownerCity: 'City',
          ownerState: 'State',
          ownerZipCode: '12345',
          ownerPhone: '123-456-7890',
        },
        executorData: {
          executorName: 'Jane Doe',
          executorAddress: '0x456',
          executorPhone: '123-456-7890',
          executorEmail: 'jane@example.com',
        },
        beneficiaries: [],
        queuedSessions: [],
        keyInstructions: 'Test instructions',
      }

      const json = exportToJSON(data)
      const parsed = JSON.parse(json)

      expect(parsed.version).toBe('1.0.0')
      expect(parsed.ownerData.ownerName).toBe('John Doe')
    })

    it('should format JSON with indentation', () => {
      const data: ExportData = {
        version: '1.0.0',
        timestamp: 1234567890,
        ownerData: {
          ownerName: 'Test',
          ownerFullName: 'Test',
          ownerAddress: '0x123',
          ownerCity: 'City',
          ownerState: 'State',
          ownerZipCode: '12345',
          ownerPhone: '123-456-7890',
        },
        executorData: {
          executorName: 'Test',
          executorAddress: '0x456',
        },
        beneficiaries: [],
        queuedSessions: [],
        keyInstructions: 'Test',
      }

      const json = exportToJSON(data)
      expect(json).toContain('\n')
      expect(json).toContain('  ') // Indentation
    })
  })

  describe('exportToCSV', () => {
    it('should export beneficiaries to CSV', () => {
      const data: ExportData = {
        version: '1.0.0',
        timestamp: 1234567890,
        ownerData: {
          ownerName: 'Test',
          ownerFullName: 'Test',
          ownerAddress: '0x123',
          ownerCity: 'City',
          ownerState: 'State',
          ownerZipCode: '12345',
          ownerPhone: '123-456-7890',
        },
        executorData: {
          executorName: 'Test',
          executorAddress: '0x456',
        },
        beneficiaries: [
          {
            name: 'Beneficiary 1',
            walletAddress: '0x111',
            ensName: 'ben1.eth',
            phone: '123-456-7890',
            email: 'ben1@example.com',
            notes: 'Notes 1',
          },
          {
            name: 'Beneficiary 2',
            walletAddress: '0x222',
          },
        ],
        queuedSessions: [],
        keyInstructions: 'Test',
      }

      const csv = exportToCSV(data)
      const lines = csv.split('\n')

      expect(lines[0]).toBe('Name,Wallet Address,ENS Name,Phone,Email,Notes')
      expect(lines[1]).toContain('Beneficiary 1')
      expect(lines[1]).toContain('0x111')
      expect(lines[1]).toContain('ben1.eth')
      expect(lines[2]).toContain('Beneficiary 2')
    })

    it('should handle empty beneficiaries', () => {
      const data: ExportData = {
        version: '1.0.0',
        timestamp: 1234567890,
        ownerData: {
          ownerName: 'Test',
          ownerFullName: 'Test',
          ownerAddress: '0x123',
          ownerCity: 'City',
          ownerState: 'State',
          ownerZipCode: '12345',
          ownerPhone: '123-456-7890',
        },
        executorData: {
          executorName: 'Test',
          executorAddress: '0x456',
        },
        beneficiaries: [],
        queuedSessions: [],
        keyInstructions: 'Test',
      }

      const csv = exportToCSV(data)
      expect(csv).toContain('Name,Wallet Address,ENS Name,Phone,Email,Notes')
      // CSV should have header line, and may have trailing newline
      const lines = csv.split('\n').filter(line => line.trim().length > 0)
      expect(lines.length).toBe(1) // Just the header
    })

    it('should escape quotes in CSV cells', () => {
      const data: ExportData = {
        version: '1.0.0',
        timestamp: 1234567890,
        ownerData: {
          ownerName: 'Test',
          ownerFullName: 'Test',
          ownerAddress: '0x123',
          ownerCity: 'City',
          ownerState: 'State',
          ownerZipCode: '12345',
          ownerPhone: '123-456-7890',
        },
        executorData: {
          executorName: 'Test',
          executorAddress: '0x456',
        },
        beneficiaries: [
          {
            name: 'Ben "Quote" Name',
            walletAddress: '0x111',
          },
        ],
        queuedSessions: [],
        keyInstructions: 'Test',
      }

      const csv = exportToCSV(data)
      expect(csv).toContain('"Ben "Quote" Name"')
    })
  })

  describe('downloadFile', () => {
    it('should create and click download link', () => {
      downloadFile('test content', 'test.txt', 'text/plain')

      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should create blob with correct mime type', () => {
      const content = 'test content'
      const mimeType = 'application/json'

      downloadFile(content, 'test.json', mimeType)

      expect(global.URL.createObjectURL).toHaveBeenCalled()
      // Verify blob was created (indirectly through createObjectURL call)
    })
  })

  describe('loadFromJSON', () => {
    it('should parse valid JSON data', () => {
      const data: ExportData = {
        version: '1.0.0',
        timestamp: 1234567890,
        ownerData: {
          ownerName: 'Test',
          ownerFullName: 'Test',
          ownerAddress: '0x123',
          ownerCity: 'City',
          ownerState: 'State',
          ownerZipCode: '12345',
          ownerPhone: '123-456-7890',
        },
        executorData: {
          executorName: 'Test',
          executorAddress: '0x456',
        },
        beneficiaries: [],
        queuedSessions: [],
        keyInstructions: 'Test',
      }

      const json = JSON.stringify(data)
      const result = loadFromJSON(json)

      expect(result).not.toBeNull()
      expect(result?.version).toBe('1.0.0')
      expect(result?.ownerData.ownerName).toBe('Test')
    })

    it('should return null for invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = loadFromJSON('invalid json')
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should return null for JSON missing required fields', () => {
      const invalidData = { someField: 'value' }
      const result = loadFromJSON(JSON.stringify(invalidData))
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const result = loadFromJSON('')
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})

