import fs from 'fs/promises'
import path from 'path'

import { Config } from '../../config'
import { getExtractedText, getTranscript, writeExtractedText, writeTranscript } from '../documentUtils'

describe('documentUtils', () => {
  const FILES_DIR = '/mock/files'
  const documentId = '123abc'
  const extractedText = 'Extracted text content.'
  const transcriptText = 'Transcript text content.'

  beforeAll(() => {
    // @ts-ignore
    // Config.FILES_DIR = FILES_DIR
  })

  describe('should save text extraction', () => {
    it('writes extracted text to the correct file and get the path', async () => {
      const filePath = await writeExtractedText(extractedText, documentId)
      const text = await getExtractedText(documentId)
      expect(text).toBe(extractedText)
    })

    it('handles missing extracted text file', async () => {
      await expect(getExtractedText('documentId_will_not_be_found')).rejects.toThrow(
        /Could not read extracted text file/
      )
    })
  })

  describe('should save text transcript', () => {
    it('writes transcript text to the correct file and get the path', async () => {
      const filePath = await writeTranscript(transcriptText, documentId)
      const text = await getTranscript(documentId)
      expect(text).toBe(transcriptText)
    })
  })
})
