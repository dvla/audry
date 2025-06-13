import { describe, beforeEach, test, expect, vi } from 'vitest'
import os from 'os'
import { Config } from '../../internal/config'
import { textToSpeech, writeFile } from '../textToSpeechEleven'
describe('textToSpeechEleven config test', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    Config.ELEVENLABS_API_KEY = null
  })

  test('should Fail with missing API KEY', async () => {
    await expect(textToSpeech([{ speaker: '1', text: 'Test' }])).rejects.toThrow(
      new Error('ELEVENLABS_API_KEY not set')
    )
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
        { speaker: '1', text: 'Matthew text' },
        { speaker: '2', text: 'Ellie text' },
      ],
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
    await expect(textToSpeechStreamModule.textToSpeech([{ speaker: '1', text: '' }])).rejects.toThrow(
      'No audio buffers generated from the turns'
    )
  })
})
