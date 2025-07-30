import type { AnalyzeOperationOutput } from '@azure-rest/ai-document-intelligence'
import DocumentIntelligence, { getLongRunningPoller, isUnexpected } from '@azure-rest/ai-document-intelligence'
import { DefaultAzureCredential, TokenCredential } from '@azure/identity'
import { createWriteStream, readFileSync } from 'fs'
import { pipeline } from 'stream/promises'

import { Config } from '../config'
import { log } from '../logger'

// Azure Document Intelligence configuration
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
