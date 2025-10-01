import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as cards from '../../internal/cards'
import { ActivityContext } from '../../internal/conversationHandlers'
import { DEFAULT_CONFIG } from '../../tts/episodeConfig'
import { EditTranscriptHandler } from '../editTranscriptHandler'

// const mockGetTranscripts = vi.fn()
const { mockGetTranscripts } = vi.hoisted(() => ({
  mockGetTranscripts: vi.fn(),
}))

vi.mock('../../internal/utils/documentUtils', () => ({
  getTranscripts: mockGetTranscripts,
}))

describe('EditTranscriptHandler', () => {
  let handler: EditTranscriptHandler
  let activityContext: ActivityContext

  beforeEach(() => {
    vi.clearAllMocks()

    handler = new EditTranscriptHandler()
    activityContext = {
      send: vi.fn().mockResolvedValue({}),
      sendCard: vi.fn().mockResolvedValue({}),
      proactiveSend: vi.fn().mockResolvedValue({}),
      proactiveSendCard: vi.fn().mockResolvedValue({}),
      updateCard: vi.fn().mockResolvedValue({}),
      conversation: {
        documentId: 'doc123',
        count: 0,
        documentPath: '',
        audioFilePath: '',
        userId: 'user123',
        config: DEFAULT_CONFIG,
      },
      ref: undefined,
      activity: undefined,
    }

    vi.spyOn(cards, 'textToTranscriptCard')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('triggerPatterns', () => {
    it('should have correct trigger pattern', () => {
      expect(handler.triggerPatterns).toEqual(/^.*\bedit.*$/i)
    })

    it('should match edit commands case-insensitively', () => {
      const pattern = handler.triggerPatterns as RegExp
      expect(pattern.test('edit')).toBe(true)
      expect(pattern.test('Edit')).toBe(true)
      expect(pattern.test('EDIT')).toBe(true)
      expect(pattern.test('edit transcript')).toBe(true)
      expect(pattern.test('please edit this')).toBe(true)
      expect(pattern.test('I want to edit')).toBe(true)
    })

    it('should not match commands without edit', () => {
      const pattern = handler.triggerPatterns as RegExp
      expect(pattern.test('upload')).toBe(false)
      expect(pattern.test('create')).toBe(false)
      expect(pattern.test('delete')).toBe(false)
      expect(pattern.test('help')).toBe(false)
    })
  })

  describe('handleInvoked', () => {
    it('should send textToTranscriptCard with Edit Transcript title and transcripts', async () => {
      const mockTranscripts = ['Original transcript content', 'Edited transcript content']
      mockGetTranscripts.mockResolvedValue(mockTranscripts)

      await handler.handleInvoked(activityContext)

      expect(activityContext.sendCard).toMatchSnapshot()
    })

    it('should handle empty transcripts array', async () => {
      const mockTranscripts: string[] = []
      mockGetTranscripts.mockResolvedValue(mockTranscripts)

      await handler.handleInvoked(activityContext)

      expect(activityContext.sendCard).toMatchSnapshot()
    })

    it('should handle single transcript', async () => {
      const mockTranscripts = ['Only original transcript content']
      mockGetTranscripts.mockResolvedValue(mockTranscripts)

      await handler.handleInvoked(activityContext)

      expect(activityContext.sendCard).toMatchSnapshot()
    })

    it('should handle getTranscripts error gracefully', async () => {
      const error = new Error('Failed to read transcripts')
      mockGetTranscripts.mockRejectedValue(error)

      await expect(handler.handleInvoked(activityContext)).rejects.toThrow('Failed to read transcripts')
      expect(mockGetTranscripts).toHaveBeenCalledWith(activityContext.conversation)
      expect(cards.textToTranscriptCard).not.toHaveBeenCalled()
      expect(activityContext.sendCard).not.toHaveBeenCalled()
    })
  })
})
