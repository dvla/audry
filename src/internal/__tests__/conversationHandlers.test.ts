import { ActivityTypes, CardFactory, MessageFactory, TurnContext } from 'botbuilder'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_CONFIG } from '../../tts/episodeConfig'
import { ApplicationTurnState, MessageHandler } from '../conversationHandlers'

describe('MessageHandler', () => {
  let mockContext: Partial<TurnContext>
  let mockState: ApplicationTurnState
  let mockAdapter: any
  let sendActivitySpy: any
  let updateActivitySpy: any
  let continueConversationAsyncSpy: any

  beforeEach(() => {
    vi.clearAllMocks()

    sendActivitySpy = vi.fn().mockResolvedValue({ id: 'msg-123' })
    updateActivitySpy = vi.fn().mockResolvedValue({})
    continueConversationAsyncSpy = vi.fn().mockImplementation(async (_identity, _ref, callback) => {
      await callback({ sendActivity: vi.fn().mockResolvedValue({}) })
    })

    mockAdapter = {
      BotIdentityKey: Symbol('BotIdentity'),
      continueConversationAsync: continueConversationAsyncSpy,
    }

    const turnState = new Map([[mockAdapter.BotIdentityKey, { id: 'bot-123' }]]) as any
    turnState.get = vi.fn((key) => (key === mockAdapter.BotIdentityKey ? { id: 'bot-123' } : undefined))

    mockContext = {
      activity: {
        type: ActivityTypes.Message,
        text: 'test message',
        from: { id: 'user-123' },
        conversation: { id: 'conv-123' },
        replyToId: 'reply-123',
      } as any,
      adapter: mockAdapter,
      sendActivity: sendActivitySpy,
      updateActivity: updateActivitySpy,
      turnState,
    }

    mockState = {
      conversation: {
        count: 0,
        documentId: 'doc-123',
        documentPath: '/path/to/doc.txt',
        audioFilePath: '/path/to/audio.mp3',
        userId: 'user-123',
        config: DEFAULT_CONFIG,
      },
    } as ApplicationTurnState
  })

  describe('send', () => {
    it('should call context.sendActivity with the activity', async () => {
      const handler = MessageHandler(mockContext as TurnContext, mockState)

      await handler.send('Hello world')

      expect(sendActivitySpy).toHaveBeenCalledWith('Hello world')
    })

    it('should handle activity objects', async () => {
      const handler = MessageHandler(mockContext as TurnContext, mockState)
      const activity = { type: ActivityTypes.Typing }

      await handler.send(activity)

      expect(sendActivitySpy).toHaveBeenCalledWith(activity)
    })
  })

  describe('sendCard', () => {
    it('should send an adaptive card', async () => {
      const handler = MessageHandler(mockContext as TurnContext, mockState)
      const card = { type: 'AdaptiveCard', body: [] }

      await handler.sendCard(card)

      expect(sendActivitySpy).toHaveBeenCalledWith(MessageFactory.attachment(CardFactory.adaptiveCard(card)))
    })
  })

  describe('proactiveSendCard', () => {
    it('should send card proactively using continueConversationAsync', async () => {
      const handler = MessageHandler(mockContext as TurnContext, mockState)
      const card = { type: 'AdaptiveCard', body: [] }

      await handler.proactiveSendCard(card)

      expect(continueConversationAsyncSpy).toHaveBeenCalledTimes(1)
      expect(continueConversationAsyncSpy).toHaveBeenCalledWith(
        { id: 'bot-123' },
        expect.objectContaining({ conversation: { id: 'conv-123' } }),
        expect.any(Function)
      )
    })
  })

  describe('proactiveSend', () => {
    it('should send message proactively using continueConversationAsync', async () => {
      const handler = MessageHandler(mockContext as TurnContext, mockState)

      await handler.proactiveSend('Proactive message')

      expect(continueConversationAsyncSpy).toHaveBeenCalledTimes(1)
      expect(continueConversationAsyncSpy).toHaveBeenCalledWith(
        { id: 'bot-123' },
        expect.objectContaining({ conversation: { id: 'conv-123' } }),
        expect.any(Function)
      )
    })
  })

  describe('updateCard', () => {
    it('should update an existing activity with new card', async () => {
      const handler = MessageHandler(mockContext as TurnContext, mockState)
      const card = { type: 'AdaptiveCard', body: [] }

      await handler.updateCard(card)

      expect(updateActivitySpy).toHaveBeenCalledWith({
        id: 'reply-123',
        type: ActivityTypes.Message,
        attachments: [CardFactory.adaptiveCard(card)],
      })
    })
  })

  describe('context properties', () => {
    it('should expose conversation state', () => {
      const handler = MessageHandler(mockContext as TurnContext, mockState)

      expect(handler.conversation).toBe(mockState.conversation)
      expect(handler.conversation.documentId).toBe('doc-123')
    })

    it('should expose activity', () => {
      const handler = MessageHandler(mockContext as TurnContext, mockState)

      expect(handler.activity).toBe(mockContext.activity)
      expect(handler.activity.text).toBe('test message')
    })

    it('should expose conversation reference', () => {
      const handler = MessageHandler(mockContext as TurnContext, mockState)

      expect(handler.ref).toBeDefined()
      expect(handler.ref.conversation).toEqual({ id: 'conv-123' })
    })
  })
})
