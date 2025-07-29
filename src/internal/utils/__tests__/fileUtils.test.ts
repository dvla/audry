import * as fs from 'fs/promises'
import { Readable } from 'stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { extractTextFromFile, writeContentToFile } from '../fileUtils'

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
  readFile: vi.fn(),
}))

vi.mock('fs')
vi.mock('stream/promises')

// Mock Azure Identity
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn(),
}))

// Mock config
vi.mock('../config', () => ({
  Config: {
    DOCINT_ENDPOINT: 'https://mock-endpoint.cognitiveservices.azure.com/',
  },
}))

vi.mock('@azure/ai-form-recognizer', () => {
  return {
    DocumentAnalysisClient: vi.fn().mockImplementation(() => {
      return {
        beginAnalyzeDocument: vi.fn().mockResolvedValue({
          pollUntilDone: vi.fn().mockResolvedValue({
            content: 'Line 1 Line 2',
            pages: [
              {
                lines: [{ content: 'Line 1' }, { content: 'Line 2' }],
              },
            ],
          }),
        }),
      }
    }),
    AzureKeyCredential: vi.fn(),
  }
})

// Stub logger to prevent actual logging
vi.mock('../logger', () => ({
  log: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

global.fetch = vi.fn()

describe('extractTextFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts text from a file with line data', async () => {
    const mockBuffer = Buffer.from('fake-pdf')
    const mockReadFile = vi.mocked(fs.readFile)
    mockReadFile.mockResolvedValue(mockBuffer)

    const result = await extractTextFromFile('fakepath.pdf')

    expect(result).toBe('Line 1 Line 2')
  })
})

describe('writeContentToFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes content from URL to file using stream', async () => {
    const mockStream = new Readable()
    mockStream._read = () => {}
    mockStream.push('test data')
    mockStream.push(null)

    // Mock fetch response
    ;(fetch as any).mockResolvedValue({
      ok: true,
      body: mockStream,
      status: 200,
      statusText: 'OK',
    })

    // Mock createWriteStream
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      close: vi.fn(),
    }

    const { createWriteStream } = await import('fs')
    vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as any)

    // Mock pipeline to resolve immediately
    const { pipeline } = await import('stream/promises')
    vi.mocked(pipeline).mockResolvedValue(undefined)

    await expect(writeContentToFile('http://example.com/file.pdf', 'output.pdf')).resolves.toBeUndefined()

    // Verify pipeline was called with correct arguments
    expect(pipeline).toHaveBeenCalledWith(mockStream, mockWriteStream)
  })

  it('throws error on bad fetch', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: false,
      body: null,
      status: 404,
      statusText: 'Not Found',
    })

    await expect(writeContentToFile('http://bad.url', 'output.pdf')).rejects.toThrow('Failed to download file')
  })

  it('throws error when pipeline fails', async () => {
    const mockStream = new Readable()
    mockStream._read = () => {}
    mockStream.push('test data')
    mockStream.push(null)
    ;(fetch as any).mockResolvedValue({
      ok: true,
      body: mockStream,
      status: 200,
      statusText: 'OK',
    })

    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      close: vi.fn(),
    }

    const { createWriteStream } = await import('fs')
    vi.mocked(createWriteStream).mockReturnValue(mockWriteStream as any)

    // Mock pipeline to reject
    const { pipeline } = await import('stream/promises')
    vi.mocked(pipeline).mockRejectedValue(new Error('Pipeline failed'))

    await expect(writeContentToFile('http://example.com/file.pdf', 'output.pdf')).rejects.toThrow(
      'Failed to download file'
    )
  })

  it('throws error when fetch response is not ok', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: false,
      body: null,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(writeContentToFile('http://bad.url', 'output.pdf')).rejects.toThrow('Failed to download file')
  })

  it('throws error when fetch response has no body', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      body: null,
      status: 200,
      statusText: 'OK',
    })

    await expect(writeContentToFile('http://example.com/no-body.pdf', 'output.pdf')).rejects.toThrow(
      'Failed to download file'
    )
  })
})
