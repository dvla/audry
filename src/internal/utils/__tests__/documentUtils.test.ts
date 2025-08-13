import path from 'path'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  EXTRACTED_TEXT,
  TRANSCRIPT_TEXT,
  generatePodcastFileName,
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

      expect(mockUploadFile).toHaveBeenCalledWith(userId, documentId, fileName, content, undefined)
      expect(result).toBe('https://fake-storage.blob.core.windows.net/fake-url')
    })

    test('handles Buffer content', async () => {
      const bufferContent = Buffer.from('buffer content')

      const result = await writeFile(userId, documentId, fileName, bufferContent)

      expect(mockUploadFile).toHaveBeenCalledWith(userId, documentId, fileName, bufferContent, undefined)
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
  })

  describe('generatePodcastFileName', () => {
    test('generates filename with current date and time', () => {
      // Mock the Date constructor to return a fixed date
      const mockDate = new Date('2024-03-15T14:30:00Z')
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate)

      const result = generatePodcastFileName()

      expect(result).toBe('podcast_20240315_1430')

      // Restore Date
      vi.restoreAllMocks()
    })

    test('pads single digit months and days with zeros', () => {
      const mockDate = new Date('2024-01-05T09:05:00Z')
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate)

      const result = generatePodcastFileName()

      expect(result).toBe('podcast_20240105_0905')

      vi.restoreAllMocks()
    })
  })

  describe('constants', () => {
    test('exports correct file name constants', () => {
      expect(EXTRACTED_TEXT).toBe('extracted_text.txt')
      expect(TRANSCRIPT_TEXT).toBe('transcript.txt')
    })
  })
})
