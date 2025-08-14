import { ActivityTypes } from 'botbuilder'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as cards from '../../internal/cards'
import { EpisodeKind, EpisodeVoices } from '../../tts/episodeConfig'
import { ATTACHMENT_CONTENT_TYPE, UploadFileCommandHandler } from '../uploadFileHandler'

// Mock all dependencies
vi.mock('../../internal/utils/fileUtils', () => ({
  extractTextFromFile: vi.fn().mockResolvedValue('extracted text content'),
  writeContentToFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../internal/utils/documentUtils', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  EXTRACTED_TEXT: 'extracted-text',
}))

vi.mock('../../internal/utils/userUtils', () => ({
  getUserId: vi.fn().mockReturnValue('user123'),
}))

vi.mock('../../internal/logger', () => ({
  log: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('../../internal/config', () => ({
  Config: {
    FILES_DIR: '/tmp/test-files',
  },
}))

describe('UploadFileCommandHandler', () => {
  let handler: UploadFileCommandHandler
  const sendCard = vi.fn()
  const send = vi.fn()
  const updateCard = vi.fn()
  const proactiveSendCard = vi.fn()

  beforeEach(() => {
    handler = new UploadFileCommandHandler()
    vi.clearAllMocks()
    vi.spyOn(cards, 'warningCard')
    vi.spyOn(cards, 'uploadFileCard')
  })

  it('should have correct trigger pattern', () => {
    expect(handler.triggerPatterns).toBe('uploadFile')
  })

  it('should initialize new conversation', () => {
    const activity = { from: { id: 'user123' } }
    const conversation: Record<string, any> = {}
    const filePath = '/tmp/test.txt'

    handler.newConversation(activity as any, conversation, filePath)

    expect(conversation.documentPath).toBe(filePath)
    expect(conversation.documentId).toBeDefined()
    expect(conversation.userId).toBe('user123')
    expect(conversation.config).toBeDefined()
  })

  it('should send warning when no attachment', async () => {
    const activity = { attachments: [] }
    const conversation = {}

    await handler.handleInvoked({
      activity: activity as any,
      conversation,
      sendCard,
      send,
      proactiveSendCard,
    } as any)

    // It should send the warning card first
    expect(cards.warningCard).toMatchSnapshot()
  })

  it('should process file successfully', async () => {
    const attachment = {
      name: 'test.txt',
      content: { downloadUrl: 'http://example.com/file' },
      contentType: ATTACHMENT_CONTENT_TYPE,
    }
    const activity = { attachments: [attachment], from: { id: 'user123' } }
    const conversation = {}

    await handler.handleInvoked({
      activity: activity as any,
      conversation,
      sendCard,
      send,
      proactiveSendCard,
    } as any)

    expect(send).toHaveBeenCalledWith({ type: ActivityTypes.Typing })
    expect(proactiveSendCard).toHaveBeenCalled()

    // Check that the success card was sent (simplified check)
    const cardCall = proactiveSendCard.mock.calls[0][0]
    expect(cardCall).toBeDefined()
    expect(JSON.stringify(cardCall)).toContain('Successfully extracted text from file')
  })

  it('should handle extraction error', async () => {
    const { extractTextFromFile } = await import('../../internal/utils/fileUtils.js')
    vi.mocked(extractTextFromFile).mockRejectedValueOnce(new Error('Extraction failed'))

    const attachment = {
      name: 'bad.txt',
      content: { downloadUrl: 'http://example.com/file' },
      contentType: ATTACHMENT_CONTENT_TYPE,
    }
    const activity = { attachments: [attachment], from: { id: 'user123' } }
    const conversation = {}

    await handler.handleInvoked({
      activity: activity as any,
      conversation,
      sendCard,
      send,
      proactiveSendCard,
    } as any)

    expect(proactiveSendCard).toHaveBeenCalled()

    // Check that the error card was sent (simplified check)
    const cardCall = proactiveSendCard.mock.calls[0][0]
    expect(cardCall).toBeDefined()
    expect(JSON.stringify(cardCall)).toContain('Sorry, I could not extract text')
  })

  it('should download file correctly', async () => {
    const file = {
      name: 'test.txt',
      content: { downloadUrl: 'http://example.com/file' },
    }

    const filePath = await handler.handleFileDownload(file as any)

    expect(filePath).toBe('/tmp/test-files/test.txt')
  })

  it('should handle saving config and update the card', async () => {
    const handler = new UploadFileCommandHandler()

    const conversation: any = {
      documentPath: '/tmp/test-files/test.txt',
      userId: 'user123',
      documentId: 'doc123',
      config: {},
    }

    const activity: any = {
      value: {
        kind: EpisodeKind.NEWS,
        voices: EpisodeVoices.MATTHEW,
      },
    }

    await handler.handleSaveConfig({ conversation, activity, updateCard } as any)

    expect(conversation.config.kind).toEqual(EpisodeKind.NEWS)
    expect(conversation.config.voices).toEqual([EpisodeVoices.MATTHEW])
    expect(cards.uploadFileCard).toMatchSnapshot()
  })

  it('should handle invalid config (safeParse fails) and send warning instead of updating card', async () => {
    const handler = new UploadFileCommandHandler()

    const conversation: any = {
      documentPath: '/tmp/test-files/test.txt',
      userId: 'user123',
      documentId: 'doc123',
      config: {},
    }

    // 3 voices violates max(2) in schema -> safeParse should fail
    const activity: any = {
      value: {
        voices: 'Matthew,Ellie,Daniel',
      },
    }

    await handler.handleSaveConfig({ conversation, activity, updateCard, proactiveSendCard } as any)
    expect(cards.warningCard).toMatchSnapshot()
  })
})
