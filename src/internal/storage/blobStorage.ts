import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
import { Readable } from 'stream'

import { Config } from '../config'
import { log } from '../logger'
import { getAzureCredentials } from '../utils/fileUtils'

/**
 * Service for interacting with Azure Blob Storage.
 * Handles uploads, downloads, and management of files in the cloud.
 */
export class BlobStorage {
  private blobServiceClient: BlobServiceClient
  private containerClient: ContainerClient

  /**
   * Initializes the BlobStorage service with Azure credentials.
   * Uses DefaultAzureCredential for authentication with Managed Identity support.
   */
  constructor() {
    const storageAccountName = Config.STORAGE_ACCOUNT_NAME
    const containerName = Config.STORAGE_BLOB_CONTAINER_NAME

    // Validate required configuration values
    if (!storageAccountName || !containerName) {
      throw new Error('Azure Blob Storage account name or container name not configured')
    }

    // Create the BlobServiceClient using the storage account name and credentials
    const url = `https://${storageAccountName}.blob.core.windows.net`
    this.blobServiceClient = new BlobServiceClient(url, getAzureCredentials())
    this.containerClient = this.blobServiceClient.getContainerClient(containerName)
  }

  /**
   * Ensures the container exists, creating it if necessary.
   * Note: This method is declared but not implemented.
   */

  /**
   * Uploads a file to Azure Blob Storage.
   * Stores files in a hierarchical structure of userId/documentId/fileName.
   *
   * @param userId - The ID of the user who owns the file
   * @param documentId - The unique document ID for organization
   * @param fileName - The name of the file to upload
   * @param content - The file content as Buffer, Readable stream, or string
   * @returns The URL of the uploaded blob
   * @throws Error if the upload fails
   */
  async uploadFile(
    userId: string,
    documentId: string,
    fileName: string,
    content: Buffer | Readable | string
  ): Promise<string> {
    try {
      // Note: Container creation is commented out
      // await this.ensureContainerExists()

      // Construct blob path with user/document hierarchy for organization
      const blobPath = `${userId}/${documentId}/${fileName}`

      // Get a block blob client for this specific file
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath)

      // Handle different content types with appropriate upload methods
      if (typeof content === 'string') {
        await blockBlobClient.upload(content, content.length)
      } else if (Buffer.isBuffer(content)) {
        await blockBlobClient.uploadData(content)
      } else {
        // For Readable streams
        await blockBlobClient.uploadStream(content)
      }

      log.info(`File uploaded to blob storage: ${blobPath}`)
      return blockBlobClient.url
    } catch (error) {
      log.error(`Error uploading file to blob storage: ${error.message}`, error)
      throw new Error(`Failed to upload file to blob storage: ${error.message}`)
    }
  }

  /**
   * Downloads a file from Azure Blob Storage.
   * Retrieves file from the hierarchical structure of userId/documentId/fileName.
   *
   * @param userId - The ID of the user who owns the file
   * @param documentId - The unique document ID
   * @param fileName - The name of the file to download
   * @returns The file content as a Buffer
   * @throws Error if the download fails or stream is not available
   */
  async downloadFile(userId: string, documentId: string, fileName: string): Promise<Buffer> {
    try {
      // Construct the same path hierarchy used in uploadFile
      const blobPath = `${userId}/${documentId}/${fileName}`
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath)

      // Download the blob starting from position 0
      const downloadResponse = await blockBlobClient.download(0)

      if (!downloadResponse.readableStreamBody) {
        throw new Error('No readable stream available')
      }

      // Convert stream to buffer by collecting and concatenating chunks
      const chunks: Buffer[] = []
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk))
      }

      return Buffer.concat(chunks)
    } catch (error) {
      log.error(`Error downloading file from blob storage: ${error.message}`, error)
      throw new Error(`Failed to download file from blob storage: ${error.message}`)
    }
  }
}

/**
 * Factory function to create a BlobStorage instance if properly configured.
 * Falls back to local storage if Azure Blob Storage is not configured.
 *
 * @returns A BlobStorage instance or undefined if not properly configured
 */
export const getBlobStorage = (): BlobStorage | undefined => {
  if (Config.STORAGE_ACCOUNT_NAME && Config.STORAGE_BLOB_CONTAINER_NAME) {
    try {
      return new BlobStorage()
    } catch (error) {
      log.warn(`Error creating BlobStorage: ${error.message}`)
    }
  }
  log.info('Azure Blob Storage is not configured. Using local file system as fallback.')
  return undefined
}
