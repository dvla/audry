import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as cards from '../../internal/cards'
import type { ActivityContext } from '../../internal/conversationHandlers'
import { log } from '../../internal/logger'
import { readFile } from '../../internal/utils/documentUtils'
import { DEFAULT_CONFIG } from '../../tts/episodeConfig'
import { transcriptToSpeech } from '../../tts/textoSpeechGoogle'
import { TranscriptToAudioHandler } from '../transcriptToAudioHandler'

// --- Use vi.hoisted to ensure mock functions are available when vi.mock is hoisted ---
const { mockFsWriteFile, mockFsReadFile } = vi.hoisted(() => ({
  mockFsWriteFile: vi.fn().mockResolvedValue(undefined),
  mockFsReadFile: vi.fn().mockResolvedValue('Test transcript content'),
}))

// Mock the ChatGoogleGenerativeAI
vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn(function (this: any) {
    return {
      withStructuredOutput: vi.fn(),
    }
  }),
}))

// --- Mock the internal config module that BlobStorage uses ---
vi.mock('../../internal/config', () => ({
  Config: {
    FILES_DIR: '/tmp/test-files',
    GEMINI_API_KEY: 'fake-api-key',
    MAX_NUMBER_OF_LINES: '100',
    LINES_PER_CHUNK: '10',
  },
  DEFAULT_GEMINI_TTS_MODEL: 'gemini-tts-v1', // Add this line
}))

// --- Mock fs/promises ---
vi.mock('fs/promises', () => ({
  default: {
    writeFile: mockFsWriteFile,
    readFile: mockFsReadFile,
  },
}))

// Mock dependencies
vi.mock('../../internal/utils/documentUtils')
vi.mock('../../internal/utils/graphUtils')
vi.mock('../../tts/textoSpeechGoogle')
vi.mock('../../internal/logger')

// Typed mocks
const mockReadFile = vi.mocked(readFile)
const mockTranscriptToSpeech = vi.mocked(transcriptToSpeech)
const mockLogInfo = vi.mocked(log.info)
const mockLogError = vi.mocked(log.error)

describe('TranscriptToAudioHandler', () => {
  let handler: TranscriptToAudioHandler
  let mockContext: ActivityContext
  let mockCreateFileConsentCard: ReturnType<typeof vi.spyOn>
  let mockWarningCard: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    handler = new TranscriptToAudioHandler()
    mockContext = {
      send: vi.fn(),
      sendCard: vi.fn(),
      proactiveSend: vi.fn(),
      proactiveSendCard: vi.fn(),
      updateCard: vi.fn(),
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

    // Spy on cards functions
    mockCreateFileConsentCard = vi.spyOn(cards, 'createFileConsentCard')
    mockWarningCard = vi.spyOn(cards, 'warningCard')

    mockLogInfo.mockImplementation(() => {})
    mockLogError.mockImplementation(() => {})
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
      const generateAudioSpy = vi.spyOn(handler, 'generateAudio').mockResolvedValue()

      await handler.handleActionInvoked(mockContext)
      // wait a tick for setImmediate
      await new Promise((r) => setImmediate(r))

      expect(generateAudioSpy).toHaveBeenCalledExactlyOnceWith(
        mockContext.proactiveSend,
        mockContext.proactiveSendCard,
        mockContext.conversation,
        0
      )

      generateAudioSpy.mockRestore()
    })

    it('should return processing card', async () => {
      vi.spyOn(handler, 'generateAudio').mockResolvedValue()

      const result = await handler.handleActionInvoked(mockContext)
      expect(result).toMatchSnapshot()
    })
  })

  describe('generateAudio - Success Flow', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue('Test transcript')
      mockTranscriptToSpeech.mockResolvedValue({
        outputFileName: 'audio.mp3',
        outputFilePath: '/path/to/audio.mp3',
      })

      mockCreateFileConsentCard.mockReturnValue({
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
    })

    it('should generate and send audio card', async () => {
      await handler.generateAudio(mockContext.proactiveSend, mockContext.proactiveSend, mockContext.conversation)

      expect(mockReadFile).toHaveBeenCalledExactlyOnceWith('test-user-456', 'test-doc-123', expect.any(String))
      expect(mockTranscriptToSpeech).toHaveBeenCalledExactlyOnceWith(
        { model: 'gemini-tts-v1', provider: 'google' },
        'Test transcript',
        DEFAULT_CONFIG
      )
      expect(mockCreateFileConsentCard).toHaveBeenCalled()
      expect(mockContext.proactiveSend).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type: 'message' }))
    })
  })

  describe('generateAudio - Error Handling', () => {
    beforeEach(() => {
      mockWarningCard.mockReturnValue({ type: 'warning', message: 'Failed to generate audio from transcript' })
    })

    it('should handle transcript fetch error', async () => {
      mockReadFile.mockRejectedValue(new Error('Fetch failed'))

      await handler.generateAudio(mockContext.proactiveSend, mockContext.proactiveSendCard, mockContext.conversation)

      expect(mockLogError).toHaveBeenCalled()
      expect(mockContext.proactiveSendCard).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ message: 'Failed to generate audio from transcript' })
      )
    })

    it('should handle TTS failure', async () => {
      mockReadFile.mockResolvedValue('abc')
      mockTranscriptToSpeech.mockRejectedValue(new Error('TTS failed'))

      await handler.generateAudio(mockContext.proactiveSend, mockContext.proactiveSendCard, mockContext.conversation)

      expect(mockTranscriptToSpeech).toHaveBeenCalled()
      expect(mockWarningCard).toHaveBeenCalled()
    })
  })
})
