import { SpeechSynthesizer } from 'microsoft-cognitiveservices-speech-sdk'
import * as path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Providers } from '../../features/featureTTS'
import { Config } from '../../internal/config'
import { DEFAULT_CONFIG, EpisodeVoices } from '../episodeConfig'
import { VOICE_CONFIGS, transcriptToSpeech } from '../textToSpeechAzure'

Config.SPEECH_SERVICE_ENDPOINT = 'https://mock-speech-service.cognitiveservices.azure.com/'
Config.SPEECH_KEY = 'mock-azure-speech-key'

vi.mock('../../internal/utils/authUtils', () => ({
  getAzureCredentials: vi.fn(() => 'mock-credentials'),
}))

vi.mock('../../internal/utils/documentUtils', () => ({
  generateUniqueFileName: vi.fn(() => 'test-podcast-123'),
}))

vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  return {
    SpeechConfig: {
      fromEndpoint: vi.fn(() => ({
        speechSynthesisOutputFormat: undefined,
        authorizationToken: undefined,
      })),
    },
    SpeechSynthesisOutputFormat: {
      Audio48Khz192KBitRateMonoMp3: 'Audio48Khz192KBitRateMonoMp3',
    },
    AudioConfig: {
      fromAudioFileOutput: vi.fn((path: string) => ({ path })),
    },
    SpeechSynthesizer: vi.fn(),
  }
})

describe('transcriptToSpeech', () => {
  const mockModelConfig = { provider: Providers.AZURE }
  let mockSynthesizer: { speakSsmlAsync: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()

    mockSynthesizer = {
      speakSsmlAsync: vi.fn(),
      close: vi.fn(),
    }
    vi.mocked(SpeechSynthesizer).mockImplementation(function (this: any) {
      return mockSynthesizer as unknown as SpeechSynthesizer
    })
  })

  describe('successful synthesis', () => {
    it('should synthesize multi-speaker transcript and return file paths', async () => {
      const transcript = 'SPEAKER 1: Hello there\nSPEAKER 2: Welcome to the show'

      mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, successCallback) => {
        successCallback({ errorDetails: undefined })
      })

      const result = await transcriptToSpeech(mockModelConfig, transcript)

      expect(result).toEqual({
        outputFileName: 'test-podcast-123.mp3',
        outputFilePath: path.join(Config.FILES_DIR, 'test-podcast-123.mp3'),
      })
      expect(mockSynthesizer.close).toHaveBeenCalledOnce()
    })

    it('should use correct voices from episode config', async () => {
      const transcript = 'SPEAKER 1: First\nSPEAKER 2: Second'
      const episodeConfig = {
        ...DEFAULT_CONFIG,
        voices: [EpisodeVoices.JAMIE, EpisodeVoices.CLAIRE],
      }

      mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, successCallback) => {
        expect(ssml).toContain(VOICE_CONFIGS.get(EpisodeVoices.JAMIE)!.voiceId)
        expect(ssml).toContain(VOICE_CONFIGS.get(EpisodeVoices.CLAIRE)!.voiceId)
        successCallback({ errorDetails: undefined })
      })

      await transcriptToSpeech(mockModelConfig, transcript, episodeConfig)

      expect(mockSynthesizer.speakSsmlAsync).toHaveBeenCalledOnce()
    })

    it('should generate SSML with cheerful speaking style', async () => {
      const transcript = 'SPEAKER 1: Test content'

      mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, successCallback) => {
        expect(ssml).toContain('style="cheerful"')
        expect(ssml).toContain('Test content')
        successCallback({ errorDetails: undefined })
      })

      await transcriptToSpeech(mockModelConfig, transcript)
    })

    it('should be valid SSML', async () => {
      const transcript = 'SPEAKER 1: Hello there\nSPEAKER 2: Welcome to the show'

      mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, successCallback) => {
        expect(ssml).toMatchSnapshot()
        successCallback({ errorDetails: undefined })
      })

      const result = await transcriptToSpeech(mockModelConfig, transcript)
      expect(mockSynthesizer.speakSsmlAsync).toHaveBeenCalledOnce()
    })
  })

  describe('fallback behavior', () => {
    it('should use single speaker fallback for unparseable transcript', async () => {
      const transcript = 'Just some random text without speaker labels'

      mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, successCallback) => {
        expect(ssml).toContain(VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)!.voiceId)
        expect(ssml).toContain('Just some random text')
        successCallback({ errorDetails: undefined })
      })

      await transcriptToSpeech(mockModelConfig, transcript)

      expect(mockSynthesizer.speakSsmlAsync).toHaveBeenCalledOnce()
    })

    it('should use Matthew voice for empty dialogue', async () => {
      const transcript = ''

      mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, successCallback) => {
        expect(ssml).toContain(VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)!.voiceId)
        successCallback({ errorDetails: undefined })
      })

      await transcriptToSpeech(mockModelConfig, transcript)
    })
  })

  describe('error handling', () => {
    it('should close synthesizer even when promise rejects', async () => {
      const transcript = 'SPEAKER 1: Test'

      mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, successCallback, errorCallback) => {
        errorCallback('Error')
      })

      try {
        await transcriptToSpeech(mockModelConfig, transcript)
      } catch {
        // Expected error
      }

      expect(mockSynthesizer.close).toHaveBeenCalledOnce()
    })

    it('should reject when synthesis returns errorDetails', async () => {
      const transcript = 'SPEAKER 1: Test'

      mockSynthesizer.speakSsmlAsync.mockImplementation((ssml, successCallback) => {
        successCallback({ errorDetails: 'Synthesis failed' })
      })

      await expect(transcriptToSpeech(mockModelConfig, transcript)).rejects.toThrow('Synthesis failed')

      expect(mockSynthesizer.close).toHaveBeenCalledOnce()
    })
  })
})
