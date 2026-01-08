import { Readable } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BlobStorage, getBlobStorage } from '../storage/blobStorage'

// --- Use vi.hoisted to ensure mock functions are available when vi.mock is hoisted ---
const {
  mockBlobServiceClient,
  mockContainerClient,
  mockBlockBlobClient,
  mockFsReadFile,
  mockGetAzureCredentials,
  mockPathBasename,
  mockLogInfo,
  mockLogError,
  mockLogWarn,
  mockLogDebug,
} = vi.hoisted(() => ({
  mockBlobServiceClient: {
    getContainerClient: vi.fn(),
  },
  mockContainerClient: {
    getBlockBlobClient: vi.fn(),
  },
  mockBlockBlobClient: {
    upload: vi.fn().mockResolvedValue(undefined),
    uploadData: vi.fn().mockResolvedValue(undefined),
    uploadStream: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue({
      readableStreamBody: {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('test file content')
        },
      },
    }),
    url: 'https://fake-storage.blob.core.windows.net/fake-blob-url',
  },
  mockFsReadFile: vi.fn().mockResolvedValue(Buffer.from('test file content')),
  mockGetAzureCredentials: vi.fn().mockReturnValue({
    getToken: vi.fn().mockResolvedValue({
      token: 'fake-token',
      expiresOnTimestamp: Date.now() + 3600000,
    }),
  }),
  mockPathBasename: vi.fn().mockReturnValue('test-file.pdf'),
  mockLogInfo: vi.fn(),
  mockLogError: vi.fn(),
  mockLogWarn: vi.fn(),
  mockLogDebug: vi.fn(),
}))

// --- Mock the config module ---
vi.mock('../config', () => ({
  Config: {
    STORAGE_ACCOUNT_NAME: 'fake-storage-account',
    STORAGE_BLOB_CONTAINER_NAME: 'fake-container',
  },
}))

// --- Mock fs ---
vi.mock('fs', () => ({
  promises: {
    readFile: mockFsReadFile,
  },
}))

// --- Mock path ---
vi.mock('path', () => ({
  default: {
    basename: mockPathBasename,
  },
}))

// --- Mock Azure Blob Storage ---
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: vi.fn(function (this: any) {
    return mockBlobServiceClient
  }),
  ContainerClient: vi.fn(function (this: any) {
    return mockContainerClient
  }),
}))

// --- Mock logger ---
vi.mock('../logger', () => ({
  log: {
    info: mockLogInfo,
    error: mockLogError,
    warn: mockLogWarn,
    debug: mockLogDebug,
  },
}))

// --- Mock authUtils ---
vi.mock('../utils/authUtils', () => ({
  getAzureCredentials: mockGetAzureCredentials,
}))

export const EMPTY_OPTIONS = {
  metadata: {},
}
describe('BlobStorage', () => {
  let blobStorageInstance: BlobStorage

  beforeEach(() => {
    // Setup mock implementations
    mockBlobServiceClient.getContainerClient.mockReturnValue(mockContainerClient)
    mockContainerClient.getBlockBlobClient.mockReturnValue(mockBlockBlobClient)

    // Reset all mock implementations to defaults
    mockFsReadFile.mockResolvedValue(Buffer.from('test file content'))
    mockPathBasename.mockReturnValue('test-file.pdf')

    // Clear all mocks
    vi.clearAllMocks()

    // Create fresh instance
    blobStorageInstance = new BlobStorage()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockGetAzureCredentials).toHaveBeenCalled()
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledExactlyOnceWith('fake-container')
    })
  })

  describe('uploadFile', () => {
    const userId = 'test-user-123'
    const documentId = 'test-doc-456'
    const fileName = 'test-file.txt'

    it('should upload string content successfully', async () => {
      const content = 'test string content'

      const result = await blobStorageInstance.uploadFile(userId, documentId, fileName, content)

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledExactlyOnceWith(
        `${userId}/${documentId}/${fileName}`
      )
      expect(mockBlockBlobClient.upload).toHaveBeenCalledExactlyOnceWith(content, content.length, EMPTY_OPTIONS)
      expect(mockLogInfo).toHaveBeenCalledExactlyOnceWith(
        `File uploaded to blob storage: ${userId}/${documentId}/${fileName}`
      )
      expect(result).toBe('https://fake-storage.blob.core.windows.net/fake-blob-url')
    })

    it('should upload Buffer content successfully', async () => {
      const content = Buffer.from('test buffer content')

      const result = await blobStorageInstance.uploadFile(userId, documentId, fileName, content)

      expect(mockBlockBlobClient.uploadData).toHaveBeenCalledExactlyOnceWith(content, EMPTY_OPTIONS)
      expect(result).toBe('https://fake-storage.blob.core.windows.net/fake-blob-url')
    })

    it('should upload Readable stream content successfully', async () => {
      const content = new Readable({
        read() {
          this.push('test stream content')
          this.push(null)
        },
      })

      const result = await blobStorageInstance.uploadFile(userId, documentId, fileName, content)

      expect(mockBlockBlobClient.uploadStream).toHaveBeenCalledExactlyOnceWith(content, EMPTY_OPTIONS)
      expect(result).toBe('https://fake-storage.blob.core.windows.net/fake-blob-url')
    })

    it('should handle upload error', async () => {
      const content = 'test content'
      const error = new Error('Upload failed')
      mockBlockBlobClient.upload.mockRejectedValue(error)

      await expect(blobStorageInstance.uploadFile(userId, documentId, fileName, content)).rejects.toThrow(
        'Failed to upload file to blob storage: Upload failed'
      )

      expect(mockLogError).toHaveBeenCalledExactlyOnceWith('Error uploading file to blob storage: Upload failed', error)
    })
  })

  describe('downloadFile', () => {
    const userId = 'test-user-123'
    const documentId = 'test-doc-456'
    const fileName = 'test-file.txt'

    it('should download file successfully', async () => {
      const result = await blobStorageInstance.downloadFile(userId, documentId, fileName)

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledExactlyOnceWith(
        `${userId}/${documentId}/${fileName}`
      )
      expect(mockBlockBlobClient.download).toHaveBeenCalledExactlyOnceWith(0)
      expect(result).toEqual(Buffer.from('test file content'))
    })

    it('should handle download error when no readable stream', async () => {
      mockBlockBlobClient.download.mockResolvedValue({
        readableStreamBody: null,
      })

      await expect(blobStorageInstance.downloadFile(userId, documentId, fileName)).rejects.toThrow(
        'Failed to download file from blob storage: No readable stream available'
      )

      expect(mockLogDebug).toHaveBeenCalledExactlyOnceWith(
        'Error downloading file from blob storage: No readable stream available'
      )
    })

    it('should handle download error', async () => {
      const error = new Error('Download failed')
      mockBlockBlobClient.download.mockRejectedValue(error)

      await expect(blobStorageInstance.downloadFile(userId, documentId, fileName)).rejects.toThrow(
        'Failed to download file from blob storage: Download failed'
      )

      expect(mockLogDebug).toHaveBeenCalledExactlyOnceWith('Error downloading file from blob storage: Download failed')
    })

    it('should handle multiple chunks in stream', async () => {
      mockBlockBlobClient.download.mockResolvedValue({
        readableStreamBody: {
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from('chunk1')
            yield Buffer.from('chunk2')
            yield Buffer.from('chunk3')
          },
        },
      })

      const result = await blobStorageInstance.downloadFile(userId, documentId, fileName)

      expect(result).toEqual(Buffer.from('chunk1chunk2chunk3'))
    })
  })

  describe('getBlobStorage function', () => {
    it('should return a BlobStorage instance when config is available', () => {
      const instance = getBlobStorage()
      expect(instance).toBeInstanceOf(BlobStorage)
    })
  })
})
