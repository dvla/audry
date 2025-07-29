import { Readable } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as cards from '../../internal/cards'
import { ActivityContext } from '../../internal/conversationHandlers'
import * as fileutils from '../../internal/utils/fileUtils'
import { DEFAULT_CONFIG } from '../../tts/episodeConfig'
import { ATTACHMENT_CONTENT_TYPE, FILE_TIGGER_PATTERN, UploadFileCommandHandler } from '../uploadFileHandler'

// ✅ Mock pipeline
vi.mock('stream/promises', () => ({
  pipeline: vi.fn(() => Promise.resolve()),
}))

// ✅ Mock extractTextFromFile to return string
vi.spyOn(fileutils, 'extractTextFromFile').mockResolvedValue('mocked text')

// ✅ Mock writeContentToFile
vi.spyOn(fileutils, 'writeContentToFile').mockResolvedValue()

// ✅ Optionally mock writeExtractedText if used
vi.mock('../../internal/utils/documentUtils', () => ({
  writeExtractedText: vi.fn().mockResolvedValue(undefined),
}))

// ✅ Mock fetch to return a readable stream
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    body: Readable.from(['fake file content']),
  } as any)
)

describe('UploadFileCommandHandler (general file support)', () => {
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
        userId: '',
        config: DEFAULT_CONFIG,
      },
      activity: {
        text: FILE_TIGGER_PATTERN,
        attachments: [
          {
            contentType: ATTACHMENT_CONTENT_TYPE,
            content: {
              fileType: 'pdf',
              uniqueId: '123',
              downloadUrl: 'https://example.com/file.pdf',
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
    vi.spyOn(cards, 'warningCard')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should handle valid file upload', async () => {
    await handler.handleInvoked(activityContext)

    expect(activityContext.conversation.documentId).toBeDefined()
    expect(activityContext.conversation.documentPath).toContain('file.pdf')

    expect(activityContext.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'typing' }))

    expect(cards.uploadFileCard).toHaveBeenCalledWith(
      'File Processed',
      'Successfully extracted text from file: file.pdf'
    )

    expect(activityContext.proactiveSendCard).toMatchSnapshot()
  })
})
