import fs from 'fs/promises'
import path from 'path'

import { Config } from '../config'

/**
 * Writes the extracted text to a file.
 * @param text - The extracted text to write.
 * @param documentId - The unique identifier for the document.
 * @returns The path to the saved extracted text file.
 */
export const writeExtractedText = async (text: string, documentId: string): Promise<string> => {
  const filePath = path.join(Config.FILES_DIR, `extracted_text_${documentId}.txt`)
  await fs.writeFile(filePath, text, 'utf8')
  console.log('Extracted text saved to:', filePath)
  return filePath
}

/**
 * Retrieves the extracted text from a file.
 * @param documentId - The unique identifier for the document.
 * @returns The extracted text.
 */
export const getExtractedText = async (documentId: string): Promise<string> => {
  const filePath = path.join(Config.FILES_DIR, `extracted_text_${documentId}.txt`)
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    console.error(`Error reading extracted text file at ${filePath}:`, error)
    throw new Error(`Could not read extracted text file: ${error.message}`)
  }
}

/**
 * Writes the transcript text to a file and returns the file path.
 * @param text - The transcript text to write.
 * @param documentId - The unique identifier for the document.
 * @returns The path to the saved transcript file.
 */
export const writeTranscript = async (text: string, documentId: string): Promise<string> => {
  const transcriptFilePath = path.join(Config.FILES_DIR, `transcript_${documentId}.txt`)
  await fs.writeFile(transcriptFilePath, text, 'utf8')
  console.log('Transcript text saved to:', transcriptFilePath)
  return transcriptFilePath
}

/**
 * Retrieves the transcript text from a file.
 * @param documentId - The unique identifier for the document.
 * @returns The transcript text.
 */
export const getTranscript = async (documentId: string): Promise<string> => {
  const transcriptFilePath = path.join(Config.FILES_DIR, `transcript_${documentId}.txt`)
  return await fs.readFile(transcriptFilePath, 'utf8')
}

/**
 * Generates a unique file name for the podcast based on the current date and time.
 * @returns A string representing the podcast file name.
 */
export const generatePodcastFileName = (): string => {
  const now = new Date()
  return `podcast_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
}
