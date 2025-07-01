import { GenerateContentResponse, GoogleGenAI, SpeakerVoiceConfig } from '@google/genai'
import * as wav from 'wav'
import * as path from 'path'
import { Config } from '../internal/config'

const TTS_MODEL = 'gemini-2.5-flash-preview-tts'
const STYLE =
  'Use a genuine and refined British accent for Speaker 1. Use a genuine and refined British accent for Speaker 2.'
let cloudClient: GoogleGenAI | null = null

interface SaveWaveFileOptions {
  channels?: number
  rate?: number
  sampleWidth?: number
}

interface GenerateContentConfig {
  responseModalities: string[]
  speechConfig: {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: SpeakerVoiceConfig[]
    }
  }
}

/**
 * Configuration for generating speech with multiple speaker voices
 */
export const config: GenerateContentConfig = {
  responseModalities: ['AUDIO'],
  speechConfig: {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: [
        {
          speaker: 'Speaker 1',
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
        {
          speaker: 'Speaker 2',
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Achernar' },
          },
        },
      ],
    },
  },
}

/**
 * Initializes and returns a GoogleGenAI client instance.
 * @returns An instance of a configured GoogleGenAI client.
 */
export const getGoogleClient = (): GoogleGenAI => {
  if (!cloudClient) {
    cloudClient = new GoogleGenAI({
      apiKey: Config.GEMINI_API_KEY,
    })
  }
  return cloudClient
}

/**
 * Converts a transcript to speech using Google's Gemini TTS API.
 * @param transcript - The text transcript to convert to speech.
 * @param documentId - The unique identifier for the document.
 * @param accent - The accent to use for the speech synthesis (default is 'British').
 * @returns A promise that resolves to the path of the saved audio file.
 */
export async function transcriptToSpeech(transcript: string, documentId: string): Promise<string> {
  const transcriptChunks = splitTranscript(transcript)

  console.log('Generating audio with prompt')
  const startTime = Date.now()
  const audioData = await Promise.all(transcriptChunks.map((chunk) => processChunks(chunk)))
  const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`Total audio generation time: ${totalSeconds} seconds`)

  const audioBuffers = Buffer.concat(audioData.map((data) => Buffer.from(data, 'base64')))
  const outputFilePath = path.join(Config.FILES_DIR, `${documentId}_audio.wav`)
  await saveWaveFile(outputFilePath, audioBuffers)
  return outputFilePath
}

/**
 * Splits a transcript into smaller chunks based on line breaks
 * @param transcript The full transcript text
 * @returns The transcript split into chunks of a maximum number of lines
 */
export const splitTranscript = (transcript: string): string[] => {
  const sentences = transcript.split('\n').filter((line) => line.trim() !== '')
  const chunks: string[] = []
  let currentChunk = ''

  for (let i = 0; i < sentences.length; i++) {
    currentChunk += (currentChunk ? '\n' : '') + sentences[i]
    if ((i + 1) % +Config.MAX_NUMBER_OF_LINES === 0 || i === sentences.length - 1) {
      chunks.push(currentChunk)
      currentChunk = ''
    }
  }

  console.log(`Transcript split into ${chunks.length} chunks.`)
  return chunks
}

/**
 * Processes a single chunk of text to generate speech using Google's Gemini TTS API.
 * @param chunk The text chunk to process.
 * @returns A promise that resolves to the base64 encoded audio data.
 */
export const processChunks = async (chunk: string) => {
  const ai = getGoogleClient()
  const prompt = `${STYLE}:\n\n${chunk}`
  const chunkStartTime = Date.now()

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text: prompt }] }],
    config,
  })

  const chunkSeconds = ((Date.now() - chunkStartTime) / 1000).toFixed(2)
  console.log(`Chunk processed in ${chunkSeconds} seconds`)
  console.log(`- totalTokenCount: ${response.usageMetadata?.totalTokenCount}`)

  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!data) throw new Error('No audio data received from the API')
  return data
}

/**
 * Saves raw PCM audio data as a .wav file.
 * @param filename - The path to the output .wav file.
 * @param pcmData - The raw PCM audio buffer.
 * @param options - Optional audio settings like channels, rate, and sample width.
 */
export async function saveWaveFile(
  filename: string,
  pcmData: Buffer,
  { channels = 1, rate = 24000, sampleWidth = 2 }: SaveWaveFileOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writer = new wav.FileWriter(filename, {
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8, // Convert sample width (bytes) to bit depth
    })
    writer.on('finish', resolve)
    writer.on('error', reject)
    writer.write(pcmData) // Write audio data
    writer.end()
  })
}
