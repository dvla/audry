import fs from 'fs/promises'
import path from 'path'
import { Readable } from 'stream'

import { Config } from '../config'
import { log } from '../logger'
import { getBlobStorage } from '../storage/blobStorage'

export const EXTRACTED_TEXT = 'extracted_text.txt'
export const TRANSCRIPT_TEXT = 'transcript.txt'
export const blobStorage = getBlobStorage()

/**
 * Writes the extracted text to a file.
 * @param text - The extracted text to write.
 * @param documentId - The unique identifier for the document.
 * @param userId - Optional user ID for Azure Blob Storage organization.
 * @returns The path to the saved extracted text file.
 */
export const writeFile = async (
  userId: string,
  documentId: string,
  fileName: string,
  content: Buffer | Readable | string
): Promise<string> => {
  let fileRef
  if (userId && blobStorage) {
    fileRef = await blobStorage.uploadFile(userId, documentId, fileName, content)
  } else {
    fileRef = path.join(Config.FILES_DIR, `${documentId}_${fileName}`)
    await fs.writeFile(fileRef, content, 'utf8')
    log.debug(`Extracted text saved to: ${fileRef}`)
  }

  return fileRef
}

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
    log.error(`Error reading extracted text file at ${filePath}:`, error)
    throw new Error(`Could not read extracted text file: ${error.message}`)
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
