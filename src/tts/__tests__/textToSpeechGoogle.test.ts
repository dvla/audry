import { describe, test, expect, beforeEach, vi } from 'vitest'
import path from 'path'
import { transcriptToSpeech, saveWaveFile } from '../textoSpeechGoogle'
import { Config } from '../../internal/config'

// --- Mock the @google/genai package ---
const fakeGenerateContent = vi.fn()

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn(() => ({
      models: {
        generateContent: fakeGenerateContent,
      },
    })),
  }
})

// --- Mock wav FileWriter ---
const writeMock = vi.fn()
const endMock = vi.fn()
const onMock = vi.fn().mockImplementation((event, cb) => {
  if (event === 'finish') cb()
})

vi.mock('wav', () => ({
  FileWriter: vi.fn(() => ({
    write: writeMock,
    end: endMock,
    on: onMock,
  })),
}))

// Setup config paths and API key for tests
Config.FILES_DIR = path.resolve(__dirname, '../../tests')
Config.GEMINI_API_KEY = 'fake-api-key'

// Some reusable base64 audio data
const fakeBase64Audio = Buffer.from('test audio').toString('base64')

describe('saveWaveFile', () => {
  beforeEach(() => {
    writeMock.mockClear()
    endMock.mockClear()
    onMock.mockClear()
  })

  test('writes wav file successfully', async () => {
    const filePath = path.join(Config.FILES_DIR, 'test.wav')
    const buffer = Buffer.from('dummy audio')

    await saveWaveFile(filePath, buffer)

    expect(writeMock).toHaveBeenCalledWith(buffer)
    expect(endMock).toHaveBeenCalled()
    expect(onMock).toHaveBeenCalledWith('finish', expect.any(Function))
  })
})

describe('transcriptToSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('generates audio and saves wav file', async () => {
    fakeGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  data: fakeBase64Audio,
                },
              },
            ],
          },
        },
      ],
    })

    const transcript = 'Hello Vitest!'
    const documentId = 'doc123'
    const accent = 'British'

    const outputPath = await transcriptToSpeech(transcript, documentId, accent)

    expect(fakeGenerateContent).toHaveBeenCalledTimes(1)
    expect(outputPath).toContain(`${documentId}_audio.wav`)

    // wav FileWriter's write called with decoded audio buffer
    expect(writeMock).toHaveBeenCalledWith(Buffer.from(fakeBase64Audio, 'base64'))
  })

  test('throws error if no audio data received', async () => {
    fakeGenerateContent.mockResolvedValue({
      candidates: [],
    })

    await expect(transcriptToSpeech('Test', 'doc404')).rejects.toThrow('No audio data received from the API')
  })
})
