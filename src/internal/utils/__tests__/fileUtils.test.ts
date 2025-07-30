import * as fs from 'fs'
import { Readable } from 'stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { extractTextFromFile, writeContentToFile } from '../fileUtils'

const aiDocIntelligenceMock = vi.hoisted(() => ({
  default: vi.fn(),
  getLongRunningPoller: vi.fn(),
  isUnexpected: vi.fn(),
}))
vi.mock('@azure-rest/ai-document-intelligence', () => aiDocIntelligenceMock)

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

const goodResponse = {
  status: '202',
  headers: {
    'operation-location': 'https://mock-endpoint.cognitiveservices.azure.com/operations/123',
  },
}
const badResponse = {
  status: '401',
  body: {
    error: 'Not Authorised',
  },
}
const goodResult = {
  content: 'Line 1 Line 2',
  pages: [
    {
      pageNumber: 1,
      lines: [{ content: 'Line 1' }, { content: 'Line 2' }],
      words: [{ content: 'Line' }, { content: '1' }, { content: 'Line' }, { content: '2' }],
    },
  ],
  tables: [],
}

global.fetch = vi.fn()

describe('extractTextFromFile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.clearAllMocks()
  })

  it('extracts text from a file with line data', async () => {
    aiDocIntelligenceMock.default.mockReturnValue({
      path: vi.fn(() => ({
        post: vi.fn().mockResolvedValue(goodResponse),
      })),
    })
    aiDocIntelligenceMock.getLongRunningPoller.mockReturnValue({
      pollUntilDone: vi.fn().mockResolvedValue({
        body: {
          analyzeResult: goodResult,
        },
      }),
    })
    aiDocIntelligenceMock.isUnexpected.mockReturnValue(false)
    const mockReadFile = vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-pdf'))
    const result = await extractTextFromFile('fakepath.pdf')
    expect(result).toBe('Line 1 Line 2')
  })

  it('does not extract text from a file', async () => {
    const result = await extractTextFromFile('')
    expect(result).toBe('No content extracted from the document.')
  })

  it('handles bad response', async () => {
    aiDocIntelligenceMock.default.mockReturnValue({
      path: vi.fn(() => ({
        post: vi.fn().mockResolvedValue(badResponse),
      })),
    })
    aiDocIntelligenceMock.getLongRunningPoller.mockReturnValue({
      pollUntilDone: vi.fn().mockResolvedValue({
        body: {
          analyzeResult: goodResult,
        },
      }),
    })
    aiDocIntelligenceMock.isUnexpected.mockReturnValue(true)
    const mockReadFile = vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('fake-pdf'))
    await expect(extractTextFromFile('fakepath.pdf')).rejects.toThrow('Failed to extract text from document')
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
