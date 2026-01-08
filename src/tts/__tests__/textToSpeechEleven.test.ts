import { parseBuffer } from 'music-metadata'
import os from 'os'
import path from 'path'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Config, DEFAULT_AUDIO_FILES_DIR } from '../../internal/config'
import { EpisodeIntro, EpisodeOutro } from '../episodeConfig'
import {
  DEFAULT_VOICES,
  getAudioEffects,
  parseTranscriptToSpeakerDialogue,
  textToSpeech,
  writeFile,
} from '../textToSpeechEleven'

const exampleTranscript = `
Speaker 1: Ellie, welcome back to the show! Today, we're diving deep into something that affects every single one of us who has ever flown on a plane.

Speaker 2: Okay, Matthew, airspace design? Sounds… bureaucratic, I'm not gonna lie. But you've piqued my interest. Living near Heathrow sometimes feels like living inside a jet engine.

Speaker 1: That's the perfect starting point, Ellie. You're right, most people don't think twice about what goes on behind the scenes to make air travel possible.

Speaker 2: Okay, I'm with you. It's like air traffic control on steroids, but with a long-term vision. So, who's in charge of this ambitious project? I mean, designing airspace sounds incredibly complex. It's not just drawing lines on a map, is it? I assume you need experts that do that kind of work everyday right?
`

const seed = 12345
const NO_AUDIO_EFFECTS: [undefined, undefined] = [undefined, undefined]
const LANGUAGE = 'en'

describe('textToSpeechEleven config test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Config.ELEVENLABS_API_KEY = null
  })

  test('should Fail with missing API KEY', async () => {
    const dialogue = [[{ text: 'Test', voiceId: 'test-voice' }]]
    await expect(
      textToSpeech(dialogue, seed, [undefined, undefined], 'eleven_multilingual_v2', LANGUAGE)
    ).rejects.toThrow('ELEVENLABS_API_KEY not set')
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
    vi.mock('../../internal/config', async () => {
      const actual = await vi.importActual<typeof import('../../internal/config')>('../../internal/config')
      return {
        Config: {
          ...actual.Config,
          ELEVENLABS_API_KEY: 'mock-real-key',
          FILES_DIR: os.tmpdir(),
          AUDIO_FILES_DIR: DEFAULT_AUDIO_FILES_DIR,
        },
        DEFAULT_GEMINI_TTS_MODEL: 'gemini-2.5-flash-preview-tts',
      }
    })

    vi.doMock('@elevenlabs/elevenlabs-js', () => ({
      ElevenLabsClient: vi.fn().mockImplementation(function () {
        return {
          textToDialogue: {
            stream: vi.fn().mockResolvedValue(
              (async function* () {
                yield Buffer.from('audio would be returned here')
              })()
            ),
          },
        }
      }),
    }))
    const textToSpeechStreamModule = await import('../textToSpeechEleven.js')
    const myPingBack = vi.fn()
    const dialogue = [
      [{ text: 'Matthew text', voiceId: 'test-voice' }],
      [{ text: 'Ellie text', voiceId: 'test-voice2' }],
    ]
    const result = await textToSpeechStreamModule.textToSpeech(
      dialogue,
      seed,
      NO_AUDIO_EFFECTS,
      'eleven_multilingual_v2',
      LANGUAGE,
      myPingBack
    )
    expect(myPingBack).toBeCalled()
    expect(result.outputFileName).toContain('.mp3')
    expect(result.outputFilePath).toContain(os.tmpdir())
  })

  test('should throw error if no audio buffers generated', async () => {
    vi.doMock('@elevenlabs/elevenlabs-js', () => ({
      ElevenLabsClient: vi.fn().mockImplementation(function () {
        return {
          textToDialogue: {
            stream: vi.fn().mockResolvedValue((async function* () {})()),
          },
        }
      }),
    }))
    const textToSpeechStreamModule = await import('../textToSpeechEleven.js')
    const dialogue = [[{ text: '', voiceId: 'test-voice' }]]
    await expect(
      textToSpeechStreamModule.textToSpeech(dialogue, seed, NO_AUDIO_EFFECTS, 'eleven_multilingual_v2', LANGUAGE)
    ).rejects.toThrow('No audio buffers generated from eleven textToSpeech')
  })

  test('should convert transcript to speech', async () => {
    vi.doMock('@elevenlabs/elevenlabs-js', () => ({
      ElevenLabsClient: vi.fn().mockImplementation(function () {
        return {
          textToDialogue: {
            stream: vi.fn().mockResolvedValue(
              (async function* () {
                yield Buffer.from('audio would be returned here')
              })()
            ),
          },
        }
      }),
    }))
    const textToSpeechStreamModule = await import('../textToSpeechEleven.js')
    const dialogue = parseTranscriptToSpeakerDialogue(exampleTranscript, DEFAULT_VOICES)
    const result = await textToSpeechStreamModule.textToSpeech(
      dialogue,
      seed,
      NO_AUDIO_EFFECTS,
      'eleven_multilingual_v2',
      LANGUAGE
    )
    expect(result.outputFileName).toContain('.mp3')
    expect(result.outputFilePath).toContain(os.tmpdir())
  })
})

describe('Audio Effects tests', () => {
  beforeEach(() => {
    vi.mock('../../internal/config', () => ({
      Config: {
        ELEVENLABS_API_KEY: 'mock-real-key',
        FILES_DIR: os.tmpdir(),
        AUDIO_FILES_DIR: path.join(__dirname, '../../audio'),
      },
      DEFAULT_GEMINI_TTS_MODEL: 'gemini-2.5-flash-preview-tts',
    }))
  })

  test('should get Audio Effects', async () => {
    const result = await getAudioEffects(EpisodeIntro.BEAT5, EpisodeOutro.HAPPY10)
    expect(result[0]).toBeDefined()
    expect(result[1]).toBeDefined()
    const meta = await parseBuffer(result[0] as Buffer, { mimeType: 'audio/mpeg' })
    console.log(JSON.stringify(meta, null, 2))
    expect(meta).toMatchObject({
      format: {
        codec: 'MPEG 1 Layer 3',
        container: 'MPEG',
        duration: 5.0416326530612245,
      },
    })
  })

  test('should handle not found Audio Effects', async () => {
    const result = await getAudioEffects(EpisodeIntro.BEAT5, 'Outro.NOT_FOUND' as EpisodeOutro)
    expect(result[0]).toBeDefined()
    expect(result[1]).toBeUndefined()
  })
})
