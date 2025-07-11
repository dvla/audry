import fs from 'fs/promises'
import path from 'path'
import { v7 as uuidv7 } from 'uuid'
import { afterAll, describe, expect, it } from 'vitest'

import { Config } from '../../config'
import { extractTextFromPdf, writeContentToFile } from '../fileUtils'

const sourcePdf = path.resolve(__dirname, './test.pdf')
const downloadedPdfPath = `${Config.FILES_DIR}/${uuidv7()}.pdf`
const testUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'

describe('extractTextFromPdf (real file)', () => {
  it('extracts text from up to maxPages', async () => {
    const { extractedText, pages } = await extractTextFromPdf(sourcePdf, 2)

    expect(pages).toBeLessThan(3)
    expect(extractedText.length).toBeGreaterThan(10)
  })

  it('extracts all available pages if maxPages is high', async () => {
    const { extractedText, pages } = await extractTextFromPdf(sourcePdf, 100)

    expect(pages).toBeGreaterThan(0)
    expect(extractedText).toMatch(/.+/)
  })

  it('throws error if file does not exist', async () => {
    await expect(extractTextFromPdf(path.resolve(__dirname, './assets/missing.pdf'), 1)).rejects.toThrow(/ENOENT/)
  })
})

describe('writeContentToFile (real download)', () => {
  it('downloads a file and saves it to disk', async () => {
    await writeContentToFile(testUrl, downloadedPdfPath)

    const fileBuffer = await fs.readFile(downloadedPdfPath)
    expect(fileBuffer.length).toBeGreaterThan(0)
  })

  it('can extract text from the downloaded PDF', async () => {
    const { extractedText, pages } = await extractTextFromPdf(downloadedPdfPath, 1)

    expect(pages).toBeGreaterThan(0)
    expect(extractedText).toMatch(/dummy/i)
  })

  it('throws on invalid URL', async () => {
    await expect(writeContentToFile('https://invalid.url/this-will-fail.pdf', downloadedPdfPath)).rejects.toThrow(
      'Failed to download file'
    )
  })
})

afterAll(async () => {
  try {
    await fs.unlink(downloadedPdfPath)
  } catch {}
})
