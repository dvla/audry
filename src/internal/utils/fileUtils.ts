import type { AnalyzeOperationOutput } from '@azure-rest/ai-document-intelligence'
import DocumentIntelligence, { getLongRunningPoller, isUnexpected } from '@azure-rest/ai-document-intelligence'
import { createWriteStream, readFileSync } from 'fs'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { pipeline } from 'stream/promises'

import { Config } from '../config'
import { log } from '../logger'
import { getAzureCredentials } from './authUtils'
import { EXTRACTED_TEXT, writeFile } from './documentUtils'

// Azure Document Intelligence configuration
const endpoint = Config.DOCINT_ENDPOINT
let azureClient = null

const getAzureDocumentClient = () => {
  if (!azureClient) {
    azureClient = DocumentIntelligence(endpoint, getAzureCredentials())
  }
  return azureClient
}

/**
 * Extracts text from a document (Word, Excel, PDF, Image, etc.) using Azure Document Intelligence.
 * Uses 'prebuilt-read' model, with fallback to result.content if line data is missing.
 *
 * @param filePath Path to the local document file
 * @returns Extracted text and number of pages processed
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  try {
    const client = getAzureDocumentClient()

    const base64Source = readFileSync(filePath, { encoding: 'base64' })
    if (!base64Source) {
      log.warn('No content found in the file.')
      return 'No content extracted from the document.'
    }
    const initialResponse = await client.path('/documentModels/{modelId}:analyze', 'prebuilt-layout').post({
      contentType: 'application/json',
      body: { base64Source },
      queryParameters: { outputContentFormat: 'markdown' }, // <-- new query parameter
    })
    if (isUnexpected(initialResponse)) {
      throw initialResponse.body.error
    }

    const poller = getLongRunningPoller(client, initialResponse)
    const analyzeResult = ((await poller.pollUntilDone()).body as AnalyzeOperationOutput).analyzeResult
    const pages = analyzeResult?.pages
    const tables = analyzeResult?.tables

    if (log.isDebugEnabled()) {
      if (!pages || pages.length <= 0) {
        log.debug('No pages were extracted from the document.')
      } else {
        log.debug('Pages:')
        for (const page of pages) {
          log.debug(
            `- Page ${page.pageNumber}: ${page.lines && page.lines.length} lines, ${page.words && page.words.length} words`
          )
        }
      }

      if (!tables || tables.length <= 0) {
        log.debug('No tables were extracted from the document.')
      } else {
        log.debug('Tables:')
        for (const table of tables) {
          log.debug(
            `- Extracted table: ${table.columnCount} columns, ${table.rowCount} rows (${table.cells.length} cells)`
          )
        }
      }
    }

    if (pages) {
      log.info(`Extracted ${pages.length} pages from the document.`)
    }
    if (tables) {
      log.info(`There are ${tables.length} tables in the document.`)
    }
    return analyzeResult.content || 'No content extracted from the document.'
  } catch (error) {
    log.error('Error extracting text from document using Azure Document Intelligence.', error)
    throw new Error('Failed to extract text from document', { cause: error })
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
    throw new Error('Failed to download file', { cause: error })
  }
}

/**
 * Extracts text from a file and writes it for .txt or .md files without using Azure.
 * For all other formats, let the caller use the normal extractTextFromFile + writeFile path.
 *
 * @param fileDownloadPath Local path to the file
 * @param userId User ID to associate extracted text with
 * @param documentId ID of the document to associate extracted text with
 */
export async function extractAndWriteText(fileDownloadPath: string, userId: string, documentId: string): Promise<void> {
  try {
    const ext = extname(fileDownloadPath).toLowerCase()
    let extractedText

    if (ext === '.txt' || ext === '.md') {
      extractedText = await readFile(fileDownloadPath, 'utf-8')
      log.info(`Extracted text directly from ${ext} file without using Azure.`)
    } else {
      // For non-.txt/.md files, use Azure Document Intelligence
      extractedText = await extractTextFromFile(fileDownloadPath)
    }
    await writeFile(userId, documentId, EXTRACTED_TEXT, extractedText)
  } catch (error) {
    log.error('Failed to extract and write text file.', error)
    throw new Error('Failed to extract and write text', { cause: error })
  }
}
