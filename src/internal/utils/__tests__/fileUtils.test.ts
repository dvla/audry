// adjust to match your file path
import path from 'path'
import { describe, expect, it } from 'vitest'

import { extractTextFromPdf } from '../fileUtils'

describe('extractTextFromPdf (real file)', () => {
  const pdfPath = path.resolve(__dirname, './test.pdf')

  it('extracts text from up to maxPages', async () => {
    const { extractedText, pages } = await extractTextFromPdf(pdfPath, 2)

    expect(pages).toBeGreaterThan(0)
    expect(extractedText).toBeTypeOf('string')
    expect(extractedText.length).toBeGreaterThan(10)
  })

  it('extracts all available pages if maxPages is high', async () => {
    const { extractedText, pages } = await extractTextFromPdf(pdfPath, 100)

    expect(pages).toBeGreaterThan(0)
    expect(extractedText).toMatch(/.+/)
  })

  it('throws error if file does not exist', async () => {
    await expect(extractTextFromPdf(path.resolve(__dirname, './assets/missing.pdf'), 1)).rejects.toThrow(/ENOENT/)
  })
})
