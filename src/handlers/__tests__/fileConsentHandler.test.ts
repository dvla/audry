import fs from 'fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as cards from '../../internal/cards'
import { FileConsentHandler } from '../fileConsentHandler'

vi.mock('fs/promises')

vi.mock('../../internal/cards', async () => {
  const actual = await vi.importActual('../../internal/cards')
  return {
    ...actual,
    warningCard: vi.fn().mockReturnValue({ type: 'AdaptiveCard', body: [] }),
    createFileInfoAttachment: vi
      .fn()
      .mockReturnValue({ contentType: 'application/vnd.microsoft.teams.card.file.info' }),
  }
})

global.fetch = vi.fn()

describe('FileConsentHandler', () => {
  let handler: FileConsentHandler
  const send = vi.fn()
  const sendCard = vi.fn()
  const proactiveSendCard = vi.fn()

  beforeEach(() => {
    handler = new FileConsentHandler()
    vi.clearAllMocks()
  })

  describe('handleFileConsentInvoke', () => {
    it('should handle accept action and upload file successfully', async () => {
      const activity = {
        value: {
          action: 'accept',
          type: 'fileUpload',
          uploadInfo: {
            uploadUrl: 'https://example.com/upload',
            uniqueId: 'file-123',
            name: 'audio.mp3',
            contentUrl: 'https://example.com/content/audio.mp3',
          },
          context: {
            fileId: '/tmp/audio.mp3',
          },
        },
      }

      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('audio data'))
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any)
      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        statusText: 'OK',
      } as Response)

      await handler.handleFileConsentInvoke({
        activity,
        send,
        sendCard,
        proactiveSendCard,
      } as any)

      expect(send).toHaveBeenCalledWith({
        type: 'invokeResponse',
        value: { status: 200 },
      })
      expect(cards.createFileInfoAttachment).toHaveBeenCalledWith(
        'audio.mp3',
        'https://example.com/content/audio.mp3',
        'file-123'
      )
    })

    it('should handle decline action', async () => {
      const activity = {
        value: {
          action: 'decline',
          type: 'fileUpload',
        },
      }

      await handler.handleFileConsentInvoke({
        activity,
        send,
        sendCard,
        proactiveSendCard,
      } as any)

      expect(sendCard).toHaveBeenCalled()
      expect(cards.warningCard).toMatchSnapshot()
    })

    it('should handle upload errors', async () => {
      const activity = {
        value: {
          action: 'accept',
          type: 'fileUpload',
          uploadInfo: {
            uploadUrl: 'https://example.com/upload',
          },
          context: {
            fileId: '/tmp/audio.mp3',
          },
        },
      }

      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      await handler.handleFileConsentInvoke({
        activity,
        send,
        sendCard,
        proactiveSendCard,
      } as any)

      expect(sendCard).toHaveBeenCalled()
      expect(cards.warningCard).toMatchSnapshot()
    })
  })

  describe('uploadFileToTeams', () => {
    it('should upload small file in single chunk', async () => {
      const uploadUrl = 'https://example.com/upload'
      const fileBuffer = Buffer.from('small file content')
      const fileSize = fileBuffer.length

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        statusText: 'OK',
      } as Response)

      const result = await handler['uploadFileToTeams'](uploadUrl, fileBuffer, fileSize)

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should upload large file in multiple chunks', async () => {
      const uploadUrl = 'https://example.com/upload'
      const chunkSize = 327680 // 320KB
      const fileSize = chunkSize * 2 + 1000
      const fileBuffer = Buffer.alloc(fileSize)

      vi.mocked(global.fetch).mockResolvedValue({
        status: 200,
        statusText: 'OK',
      } as Response)

      const result = await handler['uploadFileToTeams'](uploadUrl, fileBuffer, fileSize)

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should handle upload failure', async () => {
      const uploadUrl = 'https://example.com/upload'
      const fileBuffer = Buffer.from('test')
      const fileSize = fileBuffer.length

      vi.mocked(global.fetch).mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const result = await handler['uploadFileToTeams'](uploadUrl, fileBuffer, fileSize)

      expect(result.success).toBe(false)
      expect(result.error).toBe('HTTP 500: Internal Server Error')
    })
  })
})
