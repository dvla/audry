import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest'
import { UploadFileCommandHandler, ATTACHMENT_CONTENT_TYPE, FILE_TIGGER_PATTERN } from '../uploadFileCommandHandler'
import { Readable } from 'stream'
import * as fileutils from '../../internal/utils/fileUtils'

vi.mock('stream/promises', () => ({
  pipeline: vi.fn(() => Promise.resolve()),
}))
vi.spyOn(fileutils, 'extractTextFromPdf').mockResolvedValue({
  extractedText: 'mocked text',
  pages: 3,
})
vi.spyOn(fileutils, 'writeContentToFile')
global.fetch = vi.fn()

describe('UploadFileCommandHandler', () => {
  let handler: UploadFileCommandHandler
  let activityHandler: any

  beforeEach(() => {
    handler = new UploadFileCommandHandler()

    activityHandler = {
      send: vi.fn().mockResolvedValue({}),
      sendCard: vi.fn().mockResolvedValue({}),
      proactiveSendCard: vi.fn().mockResolvedValue({}),
      conversation: {},
      activity: {
        text: FILE_TIGGER_PATTERN,
        attachments: [
          {
            contentType: ATTACHMENT_CONTENT_TYPE,
            content: {
              fileType: 'pdf',
              uniqueId: '123',
              downloadUrl: 'https://committees.parliament.uk/publications/48300/documents/252838/default/',
              name: 'file.pdf',
            },
            name: 'file.pdf',
          },
        ],
      },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should handle valid PDF file upload', async () => {
    const readableMock = new Readable({ read() {} })
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      body: readableMock,
    })
    await handler.handleInvoked(activityHandler)
    expect(activityHandler.conversation.documentId).toBeDefined()
    expect(activityHandler.conversation.documentPath).toContain('file.pdf')
    expect(activityHandler.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'typing',
      })
    )
    expect(activityHandler.proactiveSendCard).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.arrayContaining([
          expect.objectContaining({
            type: 'Container',
            items: expect.arrayContaining([
              expect.objectContaining({
                type: 'ColumnSet',
                columns: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'Column',
                    items: expect.arrayContaining([
                      expect.objectContaining({
                        type: 'TextBlock',
                        text: expect.stringMatching(/Extracted text from 3 page\(s\).*textToTranscript/i),
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
        type: 'AdaptiveCard',
      })
    )
  })

  it('should reject non-PDF files', async () => {
    activityHandler.activity.attachments[0].content.fileType = 'docx'
    await handler.handleInvoked(activityHandler)
    expect(activityHandler.sendCard).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.arrayContaining([
          expect.objectContaining({
            type: 'Container',
            style: 'warning',
            items: expect.arrayContaining([
              expect.objectContaining({
                type: 'ColumnSet',
                columns: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'Column',
                    items: expect.arrayContaining([
                      expect.objectContaining({
                        type: 'TextBlock',
                        text: expect.stringMatching(/only handle PDF/i),
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
        type: 'AdaptiveCard',
      })
    )
  })

  it('should handle when there are no attachments', async () => {
    activityHandler.activity.attachments = undefined
    await handler.handleInvoked(activityHandler)
    expect(activityHandler.sendCard).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.arrayContaining([
          expect.objectContaining({
            type: 'Container',
            style: 'warning',
            items: expect.arrayContaining([
              expect.objectContaining({
                type: 'ColumnSet',
                columns: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'Column',
                    items: expect.arrayContaining([
                      expect.objectContaining({
                        type: 'TextBlock',
                        text: expect.stringMatching(/only handle PDF/i),
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
        type: 'AdaptiveCard',
      })
    )
  })
})
