import { createWriteStream } from 'fs'
import fs from 'fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { pipeline } from 'stream/promises'

/**
 * Extracts text from a PDF file at the given path, up to maxPages.
 * @param filePath Path to the PDF file
 * @param maxPages Maximum number of pages to extract
 * @returns Extracted text as a string
 */
export async function extractTextFromPdf(
  filePath: string,
  maxPages: number
): Promise<{ extractedText: string; pages: number }> {
  const pdfBuffer = await fs.readFile(filePath)
  const pdfData = new Uint8Array(pdfBuffer)
  const pdf = await getDocument({ data: pdfData }).promise
  const extractUpTo = Math.min(pdf.numPages, maxPages)
  let extractedText = ''

  for (let i = 1; i <= extractUpTo; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str).join(' ')
    extractedText += pageText + '\n\n'
  }

  return {
    extractedText,
    pages: extractUpTo,
  }
}

/**
 * Downloads the file from the given URL and saves it to the specified path using fetch and stream.pipeline.
 * @param {string} contentUrl - The URL of the file to download.
 * @param {string} filePath - The path where the file will be saved.
 * @returns {Promise<void>}
 */
export async function writeContentToFile(contentUrl, filePath) {
  try {
    const res = await fetch(contentUrl)
    const fileStream = createWriteStream(filePath)
    await pipeline(res.body, fileStream)
  } catch (error) {
    console.error('Error downloading the file:', error.message)
    throw new Error('Failed to download file')
  }
}
