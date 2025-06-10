import { UploadFileCommandHandler, ATTACHMENT_CONTENT_TYPE, FILE_TIGGER_PATTERN } from '../uploadFileCommandHandler'
import { TurnContext, MessageFactory } from 'botbuilder'
import { ApplicationTurnState } from '../../internal/interface'
import fs from 'fs'
import { Readable } from 'stream'

jest.mock('fs')
jest.mock('stream/promises', () => ({ pipeline: jest.fn(() => Promise.resolve()) }))

global.fetch = jest.fn()

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
      sendActivity: jest.fn(),
    }
    ;(fs.createWriteStream as jest.Mock).mockReturnValue({
      on: jest.fn().mockImplementation(function (event, cb) {
        if (event === 'finish') setImmediate(cb)
        return this
      }),
    })
  })

  it('should handle valid PDF file upload', async () => {
    const readableMock = new Readable({ read() {} })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: readableMock,
    })
    const result = await handler.handleCommandReceived(context, state)
    expect(result).toBeDefined()
    expect(state.conversation.documentId).toBeDefined()
    expect(state.conversation.documentPath).toContain('file.pdf')
    expect(context.sendActivity).toHaveBeenCalled()
  })

  it('should reject non-PDF files', async () => {
    context.activity.attachments[0].content.fileType = 'docx'
    const result = await handler.handleCommandReceived(context, state)
    expect(result).toMatch(/only handle PDF/i)
  })

  it('should handle file download errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' })
    await expect(handler.handleCommandReceived(context, state)).rejects.toThrow('Failed to download file')
  })

  it('should handle when there are no attachments', async () => {
    context.activity.attachments = undefined
    const result = await handler.handleCommandReceived(context, state)
    expect(result).toMatch(/only handle PDF/i)
  })
})
