import os from 'os'
import { DEFAULT_TTS_MODEL_CONFIG } from 'src/features/featureTTS'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Config } from '../../internal/config'
import { DEFAULT_VOICES, textToSpeech, writeFile } from '../textToSpeechEleven'

const exampleTranscript = `
Speaker 1: Ellie, welcome back to the show! Today, we're diving deep into something that affects every single one of us who has ever flown on a plane.

Speaker 2: Okay, Matthew, airspace design? Sounds… bureaucratic, I'm not gonna lie. But you've piqued my interest. Living near Heathrow sometimes feels like living inside a jet engine.

Speaker 1: That's the perfect starting point, Ellie. You're right, most people don't think twice about what goes on behind the scenes to make air travel possible.

Speaker 2: Okay, I'm with you. It's like air traffic control on steroids, but with a long-term vision. So, who's in charge of this ambitious project? I mean, designing airspace sounds incredibly complex. It's not just drawing lines on a map, is it? I assume you need experts that do that kind of work everyday right?
`
describe('textToSpeechEleven config test', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    Config.ELEVENLABS_API_KEY = null
  })

  test('should Fail with missing API KEY', async () => {
    await expect(
      textToSpeech([{ speaker: 1, text: 'Test' }], 'eleven_multilingual_v2', DEFAULT_VOICES)
    ).rejects.toThrow(new Error('ELEVENLABS_API_KEY not set'))
  })

  test('writeFile throws error if buffers empty', async () => {
    await expect(writeFile([], '/tmp/file.mp3')).rejects.toThrow('No audio buffers to concatenate')
  })
})

describe('textToSpeechEleven tests', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.restoreAllMocks()
    Config.ELEVENLABS_API_KEY = 'mock-key'
  })

  test('should call and ping back', async () => {
    vi.mock('../../internal/config', () => ({
      Config: {
        ELEVENLABS_API_KEY: 'mock-real-key',
        FILES_DIR: os.tmpdir(),
      },
      DEFAULT_GEMINI_TTS_MODEL: 'gemini-2.5-flash-preview-tts',
    }))

    vi.doMock('@elevenlabs/elevenlabs-js', () => ({
      ElevenLabsClient: vi.fn().mockImplementation(() => ({
        textToSpeech: {
          convert: vi.fn().mockResolvedValue(
            (async function* () {
              yield Buffer.from('audio would be returned here')
            })()
          ),
        },
      })),
    }))

    const textToSpeechStreamModule = await import('../textToSpeechEleven.js')
    const myPingBack = vi.fn()
    const result = await textToSpeechStreamModule.textToSpeech(
      [
        { speaker: 1, text: 'Matthew text' },
        { speaker: 2, text: 'Ellie text' },
      ],
      'eleven_multilingual_v2',
      DEFAULT_VOICES,
      myPingBack
    )
    expect(myPingBack).toBeCalled()
  })

  test('should throw error if no audio buffers generated', async () => {
    vi.doMock('@elevenlabs/elevenlabs-js', () => ({
      ElevenLabsClient: vi.fn().mockImplementation(() => ({
        textToSpeech: {
          convert: vi.fn().mockResolvedValueOnce((async function* () {})()),
        },
      })),
    }))
    const textToSpeechStreamModule = await import('../textToSpeechEleven.js')
    await expect(
      textToSpeechStreamModule.textToSpeech([{ speaker: 1, text: '' }], 'eleven_multilingual_v2', DEFAULT_VOICES)
    ).rejects.toThrow('No audio buffers generated from the turns')
  })

  test('should convert transcript to speech', async () => {
    vi.doMock('@elevenlabs/elevenlabs-js', () => ({
      ElevenLabsClient: vi.fn().mockImplementation(() => ({
        textToSpeech: {
          convert: vi.fn().mockResolvedValue(
            (async function* () {
              yield Buffer.from('audio would be returned here')
            })()
          ),
        },
      })),
    }))
    const textToSpeechStreamModule = await import('../textToSpeechEleven.js')
    const result = await textToSpeechStreamModule.transcriptToSpeech(DEFAULT_TTS_MODEL_CONFIG, exampleTranscript)
    expect(result.outputFileName).toContain('.mp3')
    expect(result.outputFilePath).toContain(os.tmpdir())
  })
})
