import path from 'path'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { DEFAULT_CONFIG } from '../../../tts/episodeConfig'
import { ConversationState } from '../../conversationHandlers'
import {
  EDITED_TRANSCRIPT_TEXT,
  TRANSCRIPT_TEXT,
  generateUniqueFileName,
  getTranscripts,
  readFile,
  writeFile,
} from '../../utils/documentUtils'

// --- Use vi.hoisted to ensure mock functions are available when vi.mock is hoisted ---
const { mockFsWriteFile, mockFsReadFile, mockUploadFile, mockDownloadFile } = vi.hoisted(() => ({
  mockFsWriteFile: vi.fn().mockResolvedValue(undefined),
  mockFsReadFile: vi.fn().mockResolvedValue('mock file content'),
  mockUploadFile: vi.fn().mockResolvedValue('https://fake-storage.blob.core.windows.net/fake-url'),
  mockDownloadFile: vi.fn().mockResolvedValue(Buffer.from('downloaded file content')),
}))

// --- Mock Config FIRST to prevent constructor issues ---
vi.mock('../../config', () => ({
  Config: {
    FILES_DIR: path.resolve(__dirname, '../tests'),
    STORAGE_ACCOUNT_NAME: 'fake-storage-account',
    STORAGE_BLOB_CONTAINER_NAME: 'fake-container',
    GEMINI_API_KEY: 'fake-api-key',
    MAX_NUMBER_OF_LINES: '100',
    LINES_PER_CHUNK: '10',
  },
}))

// --- Mock fs/promises ---
vi.mock('fs/promises', () => ({
  default: {
    writeFile: mockFsWriteFile,
    readFile: mockFsReadFile,
  },
}))

// --- Mock Azure Identity ---
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn(() => ({
    getToken: vi.fn().mockResolvedValue({
      token: 'fake-token',
      expiresOnTimestamp: Date.now() + 3600000,
    }),
  })),
}))

// --- Mock Azure Blob Storage ---
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: vi.fn(() => ({
    getContainerClient: vi.fn(() => ({
      createIfNotExists: vi.fn().mockResolvedValue(undefined),
      getBlockBlobClient: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue(undefined),
        uploadData: vi.fn().mockResolvedValue(undefined),
        uploadStream: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue(true),
        download: vi.fn().mockResolvedValue({
          readableStreamBody: {
            [Symbol.asyncIterator]: async function* () {
              yield Buffer.from('fake-content')
            },
          },
        }),
        url: 'https://fake-storage.blob.core.windows.net/fake-blob-url',
      })),
    })),
  })),
  ContainerClient: vi.fn(),
}))

// --- Mock the BlobStorage service ---
vi.mock('../../storage/blobStorage.js', () => {
  const mockBlobStorageInstance = {
    uploadFile: mockUploadFile,
    downloadFile: mockDownloadFile,
  }

  return {
    BlobStorage: vi.fn(() => mockBlobStorageInstance),
    getBlobStorage: vi.fn(() => mockBlobStorageInstance),
    blobStorage: mockBlobStorageInstance,
  }
})

describe('fileUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('writeFile', () => {
    const userId = 'user123'
    const documentId = 'doc456'
    const fileName = 'test.txt'
    const content = 'test content'

    test('uploads to Azure when Azure is configured', async () => {
      const result = await writeFile(userId, documentId, fileName, content)

      expect(mockUploadFile).toHaveBeenCalledExactlyOnceWith(userId, documentId, fileName, content, undefined)
      expect(result).toBe('https://fake-storage.blob.core.windows.net/fake-url')
    })

    test('handles Buffer content', async () => {
      const bufferContent = Buffer.from('buffer content')

      const result = await writeFile(userId, documentId, fileName, bufferContent)

      expect(mockUploadFile).toHaveBeenCalledExactlyOnceWith(userId, documentId, fileName, bufferContent, undefined)
      expect(result).toBe('https://fake-storage.blob.core.windows.net/fake-url')
    })
  })

  describe('readFile', () => {
    const userId = 'user123'
    const documentId = 'doc456'
    const fileName = 'test.txt'

    test('falls back to local file system when no user ID', async () => {
      const result = await readFile('', documentId, fileName)

      expect(mockDownloadFile).not.toHaveBeenCalled()
      expect(mockFsReadFile).toHaveBeenCalled()
      expect(result).toBe('mock file content')
    })
    test('throws error when local file read fails', async () => {
      mockFsReadFile.mockRejectedValueOnce(new Error('File not found'))

      await expect(readFile('', documentId, fileName)).rejects.toThrow('Could not read test.txt: File not found')
    })

    test('returns null when file is missing and errorIfMissing is false', async () => {
      mockFsReadFile.mockRejectedValueOnce(new Error('File not found'))
      const result = await readFile('', documentId, fileName, false)
      expect(result).toBeNull()
    })
  })

  describe('generateUniqueFileName', () => {
    test('generates filename with current date and time', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-03-15T14:30:00Z'))

      const result = generateUniqueFileName('podcast')

      expect(result).toBe('podcast_20240315143000')

      vi.useRealTimers()
    })

    test('pads single digit months and days with zeros', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-05T09:05:00Z'))

      const result = generateUniqueFileName('podcast')

      expect(result).toBe('podcast_20240105090500')

      vi.useRealTimers()
    })
  })

  describe('getTranscripts', () => {
    const mockConversation: ConversationState = {
      count: 0,
      documentId: 'doc123',
      documentPath: '/path/to/document',
      audioFilePath: '/path/to/audio',
      userId: 'user123',
      config: DEFAULT_CONFIG,
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    test('returns both original and edited transcripts when both exist', async () => {
      // Mock readFile to return different content for different files
      vi.mocked(mockDownloadFile)
        .mockResolvedValueOnce(Buffer.from('Original transcript content'))
        .mockResolvedValueOnce(Buffer.from('Edited transcript content'))

      const result = await getTranscripts(mockConversation)

      expect(result).toEqual(['Original transcript content', 'Edited transcript content'])
      expect(mockDownloadFile).toHaveBeenCalledTimes(2)
      expect(mockDownloadFile).toHaveBeenNthCalledWith(1, 'user123', 'doc123', TRANSCRIPT_TEXT)
      expect(mockDownloadFile).toHaveBeenNthCalledWith(2, 'user123', 'doc123', EDITED_TRANSCRIPT_TEXT)
    })

    test('returns only original transcript when edited transcript does not exist', async () => {
      // Mock first call to succeed, second to fail
      vi.mocked(mockDownloadFile)
        .mockResolvedValueOnce(Buffer.from('Original transcript content'))
        .mockRejectedValueOnce(new Error('File not found'))

      const result = await getTranscripts(mockConversation)

      expect(result).toEqual(['Original transcript content'])
      expect(mockDownloadFile).toHaveBeenCalledTimes(2)
    })

    test('returns only edited transcript when original transcript does not exist', async () => {
      // Mock first call to fail, second to succeed
      vi.mocked(mockDownloadFile)
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValueOnce(Buffer.from('Edited transcript content'))

      const result = await getTranscripts(mockConversation)

      expect(result).toEqual(['Edited transcript content'])
      expect(mockDownloadFile).toHaveBeenCalledTimes(2)
    })

    test('returns empty array when neither transcript exists', async () => {
      // Mock both calls to fail
      vi.mocked(mockDownloadFile)
        .mockRejectedValueOnce(new Error('File not found'))
        .mockRejectedValueOnce(new Error('File not found'))

      const result = await getTranscripts(mockConversation)

      expect(result).toEqual([])
      expect(mockDownloadFile).toHaveBeenCalledTimes(2)
    })

    test('handles file read errors gracefully', async () => {
      // When Azure fails, it should fallback to local filesystem
      vi.mocked(mockDownloadFile)
        .mockRejectedValueOnce(new Error('Azure error'))
        .mockRejectedValueOnce(new Error('Azure error'))

      // Mock local file system reads to succeed
      vi.mocked(mockFsReadFile)
        .mockResolvedValueOnce('Local original transcript')
        .mockResolvedValueOnce('Local edited transcript')

      const result = await getTranscripts(mockConversation)

      expect(result).toEqual([])
    })

    test('filters out falsy values correctly', async () => {
      // Test the internal logic that only pushes truthy values
      vi.mocked(mockDownloadFile)
        .mockResolvedValueOnce(Buffer.from('Valid transcript'))
        .mockRejectedValueOnce(new Error('File not found'))

      const result = await getTranscripts(mockConversation)

      expect(result).toEqual(['Valid transcript'])
      expect(result).toHaveLength(1)
    })

    test('maintains order - original transcript first, edited transcript second', async () => {
      vi.mocked(mockDownloadFile)
        .mockResolvedValueOnce(Buffer.from('ORIGINAL'))
        .mockResolvedValueOnce(Buffer.from('EDITED'))

      const result = await getTranscripts(mockConversation)

      expect(result[0]).toBe('ORIGINAL')
      expect(result[1]).toBe('EDITED')
      expect(result).toHaveLength(2)
    })
  })
})
