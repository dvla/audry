import { Hono } from 'hono'
import * as fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { reviewTranscript } from '../../internal/utils/graphUtils'
import { DEFAULT_CONFIG, EpisodeConfig, EpisodeKind, EpisodeLanguages, EpisodeLength } from '../../tts/episodeConfig'
import { toTranscript, transcriptToAudioProvider } from '../../tts/textToTranscript'
import { routes } from '../routes'

// Mock dependencies
vi.mock('../../tts/textToTranscript', () => ({
  toTranscript: vi.fn(),
  transcriptToAudioProvider: vi.fn(),
}))

vi.mock('../../internal/utils/graphUtils', () => ({
  reviewTranscript: vi.fn(),
  generateShowNotes: vi.fn(),
}))

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}))

// Get typed mock functions
const mockToTranscript = vi.mocked(toTranscript)
const mockTranscriptToAudioProvider = vi.mocked(transcriptToAudioProvider)
const mockReviewTranscript = vi.mocked(reviewTranscript)

describe('API Routes', () => {
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono()
    routes(app)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/texttotranscript', () => {
    it('should return transcript when given valid text input', async () => {
      const mockTranscript = 'This is a generated transcript.'
      mockToTranscript.mockResolvedValue(mockTranscript)

      const response = await app.request('/api/texttotranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Sample input text',
        }),
      })

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ Transcript: mockTranscript })
      expect(mockToTranscript).toHaveBeenCalledExactlyOnceWith('Sample input text', DEFAULT_CONFIG)
    })

    it('should use custom config when provided', async () => {
      const customConfig: Partial<EpisodeConfig> = {
        language: EpisodeLanguages.WELSH,
        length: EpisodeLength.FULL,
      }
      const mockTranscript = 'Custom config transcript.'
      mockToTranscript.mockResolvedValue(mockTranscript)

      const response = await app.request('/api/texttotranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Sample input text',
          config: customConfig,
        }),
      })

      expect(response.status).toBe(200)
      expect(mockToTranscript).toHaveBeenCalledExactlyOnceWith(
        'Sample input text',
        expect.objectContaining(customConfig)
      )
    })

    it('should return 400 for invalid request body', async () => {
      const response = await app.request('/api/texttotranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required 'text' field
          config: {},
        }),
      })

      expect(response.status).toBe(400)
    })

    it('should return 500 when toTranscript fails', async () => {
      mockToTranscript.mockRejectedValue(new Error('AI service error'))

      const response = await app.request('/api/texttotranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Sample input text',
        }),
      })

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/transcripttoaudio', () => {
    const mockAudioProvider = vi.fn()

    beforeEach(() => {
      mockTranscriptToAudioProvider.mockResolvedValue(mockAudioProvider)
    })

    it('should stream audio file when transcript conversion succeeds', async () => {
      const mockFileBuffer = Buffer.from('mock audio data')
      const mockOutputFileName = 'audio.mp3'
      const mockOutputFilePath = '/path/to/audio.mp3'

      mockAudioProvider.mockResolvedValue({
        outputFileName: mockOutputFileName,
        outputFilePath: mockOutputFilePath,
      })

      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer)

      const response = await app.request('/api/transcripttoaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'This is a transcript to convert to audio.',
        }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
      expect(response.headers.get('Content-Disposition')).toBe(`attachment; filename="${mockOutputFileName}"`)
      expect(mockTranscriptToAudioProvider).toHaveBeenCalledExactlyOnceWith(DEFAULT_CONFIG)
      expect(mockAudioProvider).toHaveBeenCalledExactlyOnceWith('This is a transcript to convert to audio.')
    })

    it('should return 500 when transcript to audio conversion fails', async () => {
      mockAudioProvider.mockResolvedValue({
        outputFileName: null,
        outputFilePath: null,
      })

      const response = await app.request('/api/transcripttoaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'This is a transcript to convert to audio.',
        }),
      })

      expect(response.status).toBe(500)
      expect(await response.json()).toBe('transcriptToAudio failed')
    })

    it('should handle file reading errors gracefully', async () => {
      const mockOutputFileName = 'audio.mp3'
      const mockOutputFilePath = '/path/to/audio.mp3'

      mockAudioProvider.mockResolvedValue({
        outputFileName: mockOutputFileName,
        outputFilePath: mockOutputFilePath,
      })

      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found')
      })

      const response = await app.request('/api/transcripttoaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'This is a transcript to convert to audio.',
        }),
      })

      expect(response.status).toBe(500)
    })

    it('should use custom config when provided', async () => {
      const customConfig: Partial<EpisodeConfig> = {
        language: EpisodeLanguages.WELSH,
        length: EpisodeLength.BRIEF,
      }
      const mockFileBuffer = Buffer.from('mock audio data')
      const mockOutputFileName = 'audio_welsh.mp3'
      const mockOutputFilePath = '/path/to/audio_welsh.mp3'

      mockAudioProvider.mockResolvedValue({
        outputFileName: mockOutputFileName,
        outputFilePath: mockOutputFilePath,
      })

      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer)

      const response = await app.request('/api/transcripttoaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'This is a transcript to convert to audio.',
          config: customConfig,
        }),
      })

      expect(response.status).toBe(200)
      expect(mockTranscriptToAudioProvider).toHaveBeenCalledExactlyOnceWith(expect.objectContaining(customConfig))
    })
  })

  describe('POST /api/texttoaudio', () => {
    const mockAudioProvider = vi.fn()

    beforeEach(() => {
      mockTranscriptToAudioProvider.mockResolvedValue(mockAudioProvider)
    })

    it('should convert text to transcript then to audio successfully', async () => {
      const mockTranscript = 'Generated transcript from text.'
      const mockFileBuffer = Buffer.from('mock audio data')
      const mockOutputFileName = 'complete_audio.mp3'
      const mockOutputFilePath = '/path/to/complete_audio.mp3'

      mockToTranscript.mockResolvedValue(mockTranscript)
      mockAudioProvider.mockResolvedValue({
        outputFileName: mockOutputFileName,
        outputFilePath: mockOutputFilePath,
      })

      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer)

      const response = await app.request('/api/texttoaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Original text to be converted to audio.',
        }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
      expect(response.headers.get('Content-Disposition')).toBe(`attachment; filename="${mockOutputFileName}"`)

      // Verify the complete flow
      expect(mockToTranscript).toHaveBeenCalledExactlyOnceWith(
        'Original text to be converted to audio.',
        DEFAULT_CONFIG
      )
      expect(mockTranscriptToAudioProvider).toHaveBeenCalledExactlyOnceWith(DEFAULT_CONFIG)
      expect(mockAudioProvider).toHaveBeenCalledExactlyOnceWith(mockTranscript)
    })

    it('should return 500 when transcript generation fails', async () => {
      mockToTranscript.mockRejectedValue(new Error('Transcript generation failed'))

      const response = await app.request('/api/texttoaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Text that will fail to convert.',
        }),
      })

      expect(response.status).toBe(500)
    })

    it('should handle audio generation failure after successful transcript generation', async () => {
      const mockTranscript = 'Generated transcript from text.'

      mockToTranscript.mockResolvedValue(mockTranscript)
      mockAudioProvider.mockResolvedValue({
        outputFileName: null,
        outputFilePath: null,
      })

      const response = await app.request('/api/texttoaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Text that will fail at audio conversion.',
        }),
      })

      expect(response.status).toBe(500)
      expect(await response.json()).toBe('transcriptToAudio failed')
      expect(mockToTranscript).toHaveBeenCalled()
      expect(mockAudioProvider).toHaveBeenCalledExactlyOnceWith(mockTranscript)
    })

    it('should work with custom configuration for both transcript and audio generation', async () => {
      const customConfig: Partial<EpisodeConfig> = {
        language: EpisodeLanguages.WELSH,
        kind: EpisodeKind.NEWS,
        length: EpisodeLength.BRIEF,
      }
      const mockTranscript = 'Welsh news briefing transcript.'
      const mockFileBuffer = Buffer.from('mock welsh audio data')
      const mockOutputFileName = 'welsh_news.mp3'
      const mockOutputFilePath = '/path/to/welsh_news.mp3'

      mockToTranscript.mockResolvedValue(mockTranscript)
      mockAudioProvider.mockResolvedValue({
        outputFileName: mockOutputFileName,
        outputFilePath: mockOutputFilePath,
      })

      vi.mocked(fs.readFileSync).mockReturnValue(mockFileBuffer)

      const response = await app.request('/api/texttoaudio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Original Welsh text content.',
          config: customConfig,
        }),
      })

      expect(response.status).toBe(200)
      expect(mockToTranscript).toHaveBeenCalledExactlyOnceWith(
        'Original Welsh text content.',
        expect.objectContaining(customConfig)
      )
      expect(mockTranscriptToAudioProvider).toHaveBeenCalledExactlyOnceWith(expect.objectContaining(customConfig))
      expect(mockAudioProvider).toHaveBeenCalledExactlyOnceWith(mockTranscript)
    })
  })

  describe('POST /api/reviewtranscript', () => {
    it('should return review feedback when given valid transcript input', async () => {
      const mockReview = {
        originalTranscript: 'Sample transcript to review',
        bgFeedback: 'British grammar is correct',
        crFeedback: 'Content is appropriate',
        edaFeedback: 'Delivery is expressive',
        finalTranscript: 'Final reviewed transcript',
      }
      mockReviewTranscript.mockResolvedValue(mockReview)

      const response = await app.request('/api/reviewtranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Sample transcript to review',
        }),
      })

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result).toEqual({
        'British Grammar Feedback': mockReview.bgFeedback,
        'Content Reviewer Feedback': mockReview.crFeedback,
        'Expressive Delivery Feedback': mockReview.edaFeedback,
        'Final Transcript': mockReview.finalTranscript,
      })
      expect(mockReviewTranscript).toHaveBeenCalledExactlyOnceWith(
        'Sample transcript to review',
        expect.stringMatching(/^API_ReviewTranscript_\d+$/)
      )
    })

    it('should return 500 when reviewTranscript fails', async () => {
      mockReviewTranscript.mockRejectedValue(new Error('Review service error'))

      const response = await app.request('/api/reviewtranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Sample transcript to review',
        }),
      })

      expect(response.status).toBe(500)
    })
  })

  describe('Request validation', () => {
    it('should reject requests without text field', async () => {
      const endpoints = ['/api/texttotranscript', '/api/transcripttoaudio', '/api/texttoaudio']

      for (const endpoint of endpoints) {
        const response = await app.request(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {},
          }),
        })

        expect(response.status).toBe(400)
      }
    })

    it('should reject requests with invalid JSON', async () => {
      const endpoints = ['/api/texttotranscript', '/api/transcripttoaudio', '/api/texttoaudio']

      for (const endpoint of endpoints) {
        const response = await app.request(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json',
        })

        expect(response.status).toBe(400)
      }
    })

    it('should accept empty config object', async () => {
      mockToTranscript.mockResolvedValue('test transcript')

      const response = await app.request('/api/texttotranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Sample text',
          config: {},
        }),
      })

      expect(response.status).toBe(200)
    })

    it('should accept request without config field', async () => {
      mockToTranscript.mockResolvedValue('test transcript')

      const response = await app.request('/api/texttotranscript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Sample text',
        }),
      })

      expect(response.status).toBe(200)
    })
  })
})
