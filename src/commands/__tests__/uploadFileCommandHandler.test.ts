import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest'
import { UploadFileCommandHandler, ATTACHMENT_CONTENT_TYPE, FILE_TIGGER_PATTERN } from '../uploadFileCommandHandler'
import { ApplicationTurnState } from '../../internal/interface'
import fs from 'fs'
import { Readable } from 'stream'

vi.mock('fs')
vi.mock('stream/promises', () => ({ pipeline: vi.fn(() => Promise.resolve()) }))

global.fetch = vi.fn()

describe('UploadFileCommandHandler', () => {
  let handler: UploadFileCommandHandler
  let context: any
  let state: ApplicationTurnState

  beforeEach(() => {
    handler = new UploadFileCommandHandler()
    state = { conversation: {} } as any
    context = {
      activity: {
        text: FILE_TIGGER_PATTERN,
        attachments: [
          {
            contentType: ATTACHMENT_CONTENT_TYPE,
            content: {
              fileType: 'pdf',
              uniqueId: '123',
              downloadUrl: 'http://example.com/file.pdf',
              name: 'file.pdf',
            },
            name: 'file.pdf',
          },
        ],
      },
      sendActivity: vi.fn(),
    }
    // Use type assertion to 'any' for compatibility with Vitest mocks
    ;(fs.createWriteStream as any).mockReturnValue({
      on: vi.fn().mockImplementation(function (event, cb) {
        if (event === 'finish') setImmediate(cb)
        return this
      }),
    })
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
    const result = await handler.handleCommandReceived(context, state)
    expect(result).toBeDefined()
    expect(state.conversation.documentId).toBeDefined()
    expect(state.conversation.documentPath).toContain('file.pdf')
  })

  it('should reject non-PDF files', async () => {
    context.activity.attachments[0].content.fileType = 'docx'
    const result = await handler.handleCommandReceived(context, state)
    expect(result).toMatch(/only handle PDF/i)
  })

  it('should handle file download errors gracefully', async () => {
    ;(global.fetch as any).mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })
    await expect(handler.handleCommandReceived(context, state)).rejects.toThrow('Failed to download file')
  })

  it('should handle when there are no attachments', async () => {
    context.activity.attachments = undefined
    const result = await handler.handleCommandReceived(context, state)
    expect(result).toMatch(/only handle PDF/i)
  })
})
