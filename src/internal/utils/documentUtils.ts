import fs from 'fs/promises'
import path from 'path'
import { Readable } from 'stream'

import { Config } from '../config'
import { ConversationState } from '../conversationHandlers'
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
 * @param errorIfMissing - If true, throws an error if the file is missing; otherwise, returns null
 * @returns The content of the file as a string
 * @throws Error if the file reading fails
 */
export const readFile = async (
  userId: string,
  documentId: string,
  fileName: string,
  errorIfMissing = true
): Promise<string> => {
  if (userId && blobStorage) {
    try {
      const buffer = await blobStorage.downloadFile(userId, documentId, fileName)
      return buffer.toString('utf8')
    } catch (error) {
      if (errorIfMissing) {
        log.error(`Error reading ${fileName} from blob storage:`, error)
        throw new Error(`Could not read ${fileName}: ${error.message}`)
      } else {
        log.debug(`File ${fileName} not found, returning null.`)
        return null
      }
    }
  }

  // Fallback to local file system
  const filePath = path.join(Config.FILES_DIR, `${documentId}_${fileName}`)
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if (errorIfMissing) {
      log.error(`Error reading ${filePath}:`, error)
      throw new Error(`Could not read ${fileName}: ${error.message}`)
    } else {
      log.debug(`File ${filePath} not found, returning null.`)
      return null
    }
  }
}

/**
 * Generates a unique file name based on a base filename and the current date and time.
 * @param baseName - The base name of the file.
 * @returns A string representing the unique file name.
 */
export const generateUniqueFileName = (baseName: string): string => {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) // YYYYMMDDHHmmss
  return `${baseName}_${timestamp}`
}

/**
 * Retrieves the transcripts for a given conversation.
 * @param conversation - The conversation state containing user and document information.
 * @returns An array of transcript strings.
 */
export const getTranscripts = async (conversation: ConversationState) => {
  const transcripts = []

  const originalTranscript = await readFile(conversation.userId, conversation.documentId, TRANSCRIPT_TEXT, false)
  if (originalTranscript) {
    transcripts.push(originalTranscript)
  }

  const editedTranscript = await readFile(conversation.userId, conversation.documentId, EDITED_TRANSCRIPT_TEXT, false)
  if (editedTranscript) {
    transcripts.push(editedTranscript)
  }

  return transcripts
}
