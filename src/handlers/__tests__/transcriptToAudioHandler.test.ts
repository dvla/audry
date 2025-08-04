import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_TTS_MODEL_CONFIG } from '../../features/featureTTS'
import * as cards from '../../internal/cards'
import type { ActivityContext } from '../../internal/conversationHandlers.js'
import { log } from '../../internal/logger.js'
import { getTranscript } from '../../internal/utils/documentUtils.js'
import { DEFAULT_CONFIG } from '../../tts/episodeConfig'
import { transcriptToSpeech } from '../../tts/textoSpeechGoogle.js'
import { TranscriptToAudioHandler } from '../transcriptToAudioHandler'

// Mock all dependencies
vi.mock('../../internal/utils/documentUtils.js')
vi.mock('../../tts/textoSpeechGoogle.js')

vi.mock('../../internal/logger.js')

// Typed mocks
const mockGetTranscript = vi.mocked(getTranscript)
const mockTranscriptToSpeech = vi.mocked(transcriptToSpeech)
let mockCreateFileConsentCard
let mockWarningCard
const mockLogInfo = vi.mocked(log.info)
const mockLogError = vi.mocked(log.error)

describe('TranscriptToAudioHandler', () => {
  let handler: TranscriptToAudioHandler
  let mockContext: ActivityContext
  vi.spyOn(cards, 'uploadFileCard')
  vi.spyOn(cards, 'warningCard')
  vi.spyOn(cards, 'processingCard')
  beforeEach(() => {
    handler = new TranscriptToAudioHandler()
    mockContext = {
      send: vi.fn(),
      sendCard: vi.fn(),
      proactiveSend: vi.fn(),
      proactiveSendCard: vi.fn(),
      conversation: {
        documentId: 'test-doc-123',
        userId: 'test-user-456',
        count: 0,
        documentPath: '/path/to/doc.txt',
        audioFilePath: '/path/to/audio.mp3',
        config: DEFAULT_CONFIG,
      },
      ref: undefined,
      activity: undefined,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should have correct trigger pattern', () => {
      expect(handler.triggerVerb).toBe('transcriptToAudio')
    })
  })

  describe('handleActionInvoked', () => {
    it('should trigger generateAudio asynchronously', async () => {
      const generateAudioSpy = vi.spyOn(handler, 'generateAudio').mockImplementation(() => Promise.resolve())

      await handler.handleActionInvoked(mockContext)
      await new Promise((resolve) => setImmediate(resolve))

      expect(generateAudioSpy).toHaveBeenCalledWith(mockContext.proactiveSend, mockContext.conversation)
      generateAudioSpy.mockRestore()
    })

    it('should return processing card if implemented', async () => {
      vi.spyOn(handler, 'generateAudio').mockImplementation(() => Promise.resolve())

      const result = await handler.handleActionInvoked(mockContext)

      expect(result).toMatchSnapshot()
    })
  })

  describe('generateAudio - Success Flow', () => {
    beforeEach(() => {
      mockGetTranscript.mockResolvedValue('Test transcript')
      mockTranscriptToSpeech.mockResolvedValue({
        outputFileName: 'audio.mp3',
        outputFilePath: '/path/to/audio.mp3',
      })
      mockCreateFileConsentCard = vi.spyOn(cards, 'createFileConsentCard').mockReturnValue({
        contentType: 'application/vnd.microsoft.teams.card.file.consent',
        name: 'audio.mp3',
        content: {
          description: 'Transcript audio',
          acceptContext: {
            fileId: 'test-doc-123',
            fileName: 'audio.mp3',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
          declineContext: {
            fileId: 'test-doc-123',
            fileName: 'audio.mp3',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        },
      })
      mockLogInfo.mockImplementation(() => {})
    })

    it('should generate and send audio card', async () => {
      await handler.generateAudio(mockContext.proactiveSend, mockContext.conversation)

      expect(mockGetTranscript).toHaveBeenCalledWith('test-doc-123')
      expect(mockTranscriptToSpeech).toHaveBeenCalledWith(DEFAULT_TTS_MODEL_CONFIG, 'Test transcript')
      expect(mockCreateFileConsentCard).toHaveBeenCalled()
      expect(mockContext.proactiveSend).toHaveBeenCalledWith(expect.objectContaining({ type: 'message' }))
    })
  })

  describe('generateAudio - Error Handling', () => {
    beforeEach(() => {
      mockWarningCard = vi
        .spyOn(cards, 'warningCard')
        .mockReturnValue({ type: 'warning', message: 'Failed to generate audio from transcript' })
      mockLogError.mockImplementation(() => {})
    })

    it('should handle transcript fetch error', async () => {
      mockGetTranscript.mockRejectedValue(new Error('Fetch failed'))

      await handler.generateAudio(mockContext.proactiveSend, mockContext.conversation)

      expect(mockLogError).toHaveBeenCalled()
      expect(mockContext.proactiveSend).toHaveBeenCalledWith(expect.objectContaining({ type: 'message' }))
    })

    it('should handle TTS failure', async () => {
      mockGetTranscript.mockResolvedValue('abc')
      mockTranscriptToSpeech.mockRejectedValue(new Error('TTS failed'))

      await handler.generateAudio(mockContext.proactiveSend, mockContext.conversation)

      expect(mockTranscriptToSpeech).toHaveBeenCalled()
      expect(mockWarningCard).toHaveBeenCalled()
    })
  })
})
