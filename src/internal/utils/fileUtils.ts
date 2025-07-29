import { DocumentAnalysisClient } from '@azure/ai-form-recognizer'
import { DefaultAzureCredential, TokenCredential } from '@azure/identity'
import { createWriteStream } from 'fs'
import fs from 'fs/promises'
import { pipeline } from 'stream/promises'

import { Config } from '../config'
import { log } from '../logger'

// Azure Form Recognizer configuration
const endpoint = Config.DOCINT_ENDPOINT
let azureCredential = null
let azureClient = null

export const getAzureCredentials = (): TokenCredential => {
  if (!azureCredential) {
    azureCredential = new DefaultAzureCredential()
  }
  return azureCredential
}

const getAzureDocumentClient = () => {
  if (!azureClient) {
    azureClient = new DocumentAnalysisClient(endpoint, getAzureCredentials())
  }
  return azureClient
}

/**
 * Extracts text from a document (Word, Excel, PDF, Image, etc.) using Azure Form Recognizer.
 * Uses 'prebuilt-read' model, with fallback to result.content if line data is missing.
 *
 * @param filePath Path to the local document file
 * @returns Extracted text and number of pages processed
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  try {
    const client = getAzureDocumentClient()
    const fileBuffer = await fs.readFile(filePath)
    const poller = await client.beginAnalyzeDocument('prebuilt-read', fileBuffer)
    const result = await poller.pollUntilDone()

    if (!result) {
      throw new Error('Document analysis failed')
    }
    return result.content
  } catch (error) {
    log.error('Error extracting text from document using Azure Form Recognizer.', error)
    throw new Error('Failed to extract text from document')
  }
}

/**
 * Downloads a file from a URL and saves it to the given local file path using streaming.
 *
 * @param contentUrl The URL of the file to download
 * @param filePath The path to save the downloaded file
 */
export async function writeContentToFile(contentUrl: string, filePath: string): Promise<void> {
  try {
    const res = await fetch(contentUrl)
    if (!res.ok || !res.body) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`)
    }
    const fileStream = createWriteStream(filePath)
    await pipeline(res.body, fileStream)
  } catch (error) {
    log.error('Error downloading the file.', error)
    throw new Error('Failed to download file')
  }
}
