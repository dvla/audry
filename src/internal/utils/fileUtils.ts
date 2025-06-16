import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'fs/promises'

/**
 * Extracts text from a PDF file at the given path, up to maxPages.
 * @param filePath Path to the PDF file
 * @param maxPages Maximum number of pages to extract
 * @returns Extracted text as a string
 */
export async function extractTextFromPdf(filePath: string, maxPages: number): Promise<string> {
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

  return extractedText
}

/**
 * Read text from a file
 * @param filePath - The path to the file.
 * @returns A promise that resolves to the text content of the file.
 * @throws An error if the file cannot be read.
 */
export async function readTextFromFile(filePath: string): Promise<string> {
  try {
    const text = await fs.readFile(filePath, 'utf8')
    return text
  } catch (error) {
    console.error(`Error reading file at ${filePath}:`, error)
    throw new Error(`Could not read file: ${error.message}`)
  }
}
