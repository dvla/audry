import path from 'path'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Config } from '../../internal/config'
import { config, processChunks, saveWaveFile, splitTranscript, transcriptToSpeech } from '../textoSpeechGoogle'

const SMALL_TEST_TRANSCRIPT = `Speaker 1: Alright, Ellie, buckle up, because today we're diving deep into the digital heart of… the DVLA!

Speaker 2: Whoa, the DVLA? You mean, like, driver's licenses and car registration? What could possibly be exciting enough about that to warrant an entire podcast?

Speaker 1: Oh, my friend, you underestimate the sheer scale of digital transformation happening within government agencies. We're looking at the DVLA's Digital and Technology Strategic Plan for 2021-2024 – a roadmap to becoming a "Centre of Digital Excellence." I think "Driving Digital: How the DVLA is Accelerating into the Future" would be a good title.

Speaker 2: "Driving Digital"... I like it! Okay, so, strategic plan. What's the big picture here? What are they trying to achieve?

Speaker 1: In a nutshell, they want to make everything smoother, faster, and more efficient for both customers and employees. Think fewer paper forms, more online self-service, and a tech infrastructure that can adapt to whatever the future throws at it.

Speaker 2: Okay, that makes sense. Streamlining the bureaucracy, basically. But isn't that what every organization says they're trying to do? What makes this plan different?

Speaker 1: Well, a few things stand out. Firstly, they're focusing on something called "Evolve," a massive 5-year program to completely overhaul their driver services. Imagine being able to access all your driver and vehicle information in one place, a personalized online account.

Speaker 2: Oh, like a one-stop shop for all things driving-related? I am forever having to remember different passwords for different government services, so that would be amazing! Does that mean… dare I ask… a digital driving license? Like, on my phone?
`
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'
const STYLE =
  'Use a genuine and refined British accent for Speaker 1. Use a genuine and refined British accent for Speaker 2.'

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
    const { outputFileName, outputFilePath } = await transcriptToSpeech(transcript)

    expect(fakeGenerateContent).toHaveBeenCalledTimes(1)
    expect(outputFileName).toContain(`podcast`)

    // wav FileWriter's write called with decoded audio buffer
    expect(writeMock).toHaveBeenCalledWith(Buffer.from(fakeBase64Audio, 'base64'))
  })

  test('throws error if no audio data received', async () => {
    fakeGenerateContent.mockResolvedValue({
      candidates: [],
    })

    await expect(transcriptToSpeech('Test')).rejects.toThrow('No audio data received from the API')
  })
})

describe('splitTranscript', () => {
  test('split transcript into multiple parts', async () => {
    const chunks = splitTranscript(SMALL_TEST_TRANSCRIPT)
    expect(chunks).toBeDefined()
  })

  it('splits transcript into chunks of max lines, skipping empty lines', () => {
    // Setup
    process.env.MAX_NUMBER_OF_LINES = '2'

    const transcript = 'Line 1\nLine 2\n\nLine 3\nLine 4\nLine 5\n\n\nLine 6'
    const transcriptLines = 6
    const result = splitTranscript(transcript)
    expect(result.length).toBe(
      Math.floor(transcriptLines / +Config.MAX_NUMBER_OF_LINES) +
        (transcriptLines % +Config.MAX_NUMBER_OF_LINES > 0 ? 1 : 0)
    )
  })

  it('returns empty array for empty transcript', () => {
    expect(splitTranscript('')).toEqual([])
  })

  it('handles transcript with only empty lines', () => {
    expect(splitTranscript('\n\n\n')).toEqual([])
  })

  it('handles transcript with less than max lines', () => {
    expect(splitTranscript('Line 1')).toEqual(['Line 1'])
  })

  it('handles transcript with exact max lines', () => {
    expect(splitTranscript('A\nB')).toEqual(['A\nB'])
  })
})

describe('processChunks', () => {
  beforeEach(() => {
    fakeGenerateContent.mockReset()
  })

  it('returns base64 audio data when response is valid', async () => {
    fakeGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: 'base64audio' } }],
          },
        },
      ],
      usageMetadata: { totalTokenCount: 42 },
    })
    const result = await processChunks('Hello world')
    expect(result).toBe('base64audio')
    expect(fakeGenerateContent).toHaveBeenCalledWith({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: `${STYLE}:\n\nHello world` }] }],
      config: config,
    })
  })

  it('throws if no audio data is returned', async () => {
    fakeGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { data: undefined } }],
          },
        },
      ],
      usageMetadata: { totalTokenCount: 42 },
    })
    await expect(processChunks('Hello world')).rejects.toThrow('No audio data received from the API')
  })
})
