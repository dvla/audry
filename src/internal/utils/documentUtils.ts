import fs from 'fs/promises'
import path from 'path'
import { Readable } from 'stream'

import { Config } from '../config'
import { log } from '../logger'
import { getBlobStorage, metadataType } from '../storage/blobStorage'

export const EXTRACTED_TEXT = 'extracted_text.txt'
export const TRANSCRIPT_TEXT = 'transcript.txt'
export const EDITED_TRANSCRIPT_TEXT = 'transcript_edited.txt'
export const SHOW_NOTES = 'show_notes.json'
export const blobStorage = getBlobStorage()

/**
 * Writes a file to the specified storage.
 * If blobStorage is set, it uses blob storage; otherwise, it writes to the local filesystem.
 * @param userId - The ID of the user who owns the file
 * @param documentId - The unique document ID for organization
 * @param fileName - The name of the file to write
 * @param content - The file content as Buffer, Readable stream, or string
 * @param metadata - Optional metadata to associate with the file
 * @returns The file reference (URL for blob storage or local file path)
 * @throws Error if the file writing fails
 */
export const writeFile = async (
  userId: string,
  documentId: string,
  fileName: string,
  content: Buffer | Readable | string,
  metadata?: metadataType
): Promise<string> => {
  let fileRef
  if (blobStorage && userId) {
    fileRef = await blobStorage.uploadFile(userId, documentId, fileName, content, metadata)
  } else {
    fileRef = path.join(Config.FILES_DIR, `${documentId}_${fileName}`)
    await fs.writeFile(fileRef, content, 'utf8')
    log.debug(`${fileName} saved to: ${fileRef}`)
  }

  return fileRef
}

/**
 * Reads a file from the specified storage.
 * If blobStorage is set, it uses blob storage; otherwise, it reads from the local filesystem.
 * @param userId - The ID of the user who owns the file
 * @param documentId - The unique document ID for organization
 * @param fileName - The name of the file to read
 * @returns The content of the file as a string
 * @throws Error if the file reading fails
 */
export const readFile = async (userId: string, documentId: string, fileName: string): Promise<string> => {
  if (userId && blobStorage) {
    const buffer = await blobStorage.downloadFile(userId, documentId, fileName)
    return buffer.toString('utf8')
  }

  // Fallback to local file system
  const filePath = path.join(Config.FILES_DIR, `${documentId}_${fileName}`)
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    log.error(`Error reading ${filePath}:`, error)
    throw new Error(`Could not read ${fileName}: ${error.message}`)
  }
}

/**
 * Generates a unique file name for the podcast based on the current date and time.
 * @returns A string representing the podcast file name.
 */
export const generatePodcastFileName = (): string => {
  const now = new Date()
  return `podcast_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
}
