import { describe, beforeEach, it, expect, vi, afterEach, Mock } from 'vitest'
import { UploadFileCommandHandler, ATTACHMENT_CONTENT_TYPE, FILE_TIGGER_PATTERN } from '../uploadFileHandler'
import { Readable } from 'stream'
import * as fileutils from '../../internal/utils/fileUtils'
import * as cards from '../../internal/cards'
import { ActivityContext } from '../../internal/conversationHandlers'

vi.mock('stream/promises', () => ({
  pipeline: vi.fn(() => Promise.resolve()),
}))
vi.spyOn(fileutils, 'extractTextFromPdf').mockResolvedValue({
  extractedText: 'mocked text',
  pages: 3,
})
global.fetch = vi.fn()

describe('UploadFileCommandHandler', () => {
  let handler: UploadFileCommandHandler
  let activityContext: ActivityContext

  beforeEach(() => {
    handler = new UploadFileCommandHandler()

    activityContext = {
      send: vi.fn().mockResolvedValue({}),
      sendCard: vi.fn().mockResolvedValue({}),
      proactiveSend: vi.fn().mockResolvedValue({}),
      proactiveSendCard: vi.fn().mockResolvedValue({}),
      ref: undefined,
      conversation: {
        count: 0,
        documentId: '',
        documentPath: '',
        audioFilePath: '',
      },
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
        type: '',
        localTimezone: '',
        callerId: '',
        serviceUrl: '',
        channelId: '',
        from: undefined,
        conversation: undefined,
        recipient: undefined,
        label: '',
        valueType: '',
        listenFor: [],
      },
    }
    vi.spyOn(cards, 'uploadFileCard')
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
    await handler.handleInvoked(activityContext)
    expect(activityContext.conversation.documentId).toBeDefined()
    expect(activityContext.conversation.documentPath).toContain('file.pdf')
    expect(activityContext.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'typing',
      })
    )
    const cardArgs = (activityContext.proactiveSendCard as Mock).mock.calls[0][0]
    expect(cardArgs).toMatchSnapshot()
    expect(cards.uploadFileCard).toHaveBeenCalledWith('Text Extracted', `Extracted text from 3 page(s).`)
  })

  it('should reject non-PDF files', async () => {
    activityContext.activity.attachments[0].content.fileType = 'docx'
    await handler.handleInvoked(activityContext)
    expect(activityContext.sendCard).toMatchSnapshot()
  })

  it('should handle when there are no attachments', async () => {
    activityContext.activity.attachments = undefined
    await handler.handleInvoked(activityContext)
    expect(activityContext.sendCard).toMatchSnapshot()
  })

  it('should send a warning card if the text extraction fails', async () => {
    ;(fileutils.extractTextFromPdf as any).mockRejectedValueOnce(new Error('Extraction failed'))

    const readableMock = new Readable({ read() {} })
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      body: readableMock,
    })

    await handler.handleInvoked(activityContext)
    expect(activityContext.proactiveSendCard).toMatchSnapshot()
  })
})
