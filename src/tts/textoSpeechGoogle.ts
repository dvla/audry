import { GoogleGenAI, SpeakerVoiceConfig } from '@google/genai'
import * as wav from 'wav'
import * as path from 'path'
import { Config } from '../internal/config'

interface SaveWaveFileOptions {
  channels?: number
  rate?: number
  sampleWidth?: number
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

interface GenerateContentConfig {
  responseModalities: string[]
  speechConfig: {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: SpeakerVoiceConfig[]
    }
  }
}

let cloudClient: GoogleGenAI | null = null

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
export async function transcriptToSpeech(
  transcript: string,
  documentId: string,
  accent: string = 'A genuine and refined British accent.'
): Promise<string> {
  // Construct the prompt that the model will speak
  const prompt = `Say with ${accent} accent:\n\n${transcript}`

  const ai = getGoogleClient()
  const outputFilePath = path.join(Config.FILES_DIR, `${documentId}_audio.wav`)

  // Configuration for generating speech with multiple speaker voices
  const config: GenerateContentConfig = {
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

  console.log('Generating audio with prompt')

  // Request audio content from Gemini
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: prompt }] }],
    config,
  })

  console.log('Audio generation response')

  // Extract base64 audio data from the response
  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

  if (!data) throw new Error('No audio data received from the API')

  // Decode base64 audio data and save it as a .wav file
  const audioBuffer = Buffer.from(data, 'base64')
  await saveWaveFile(outputFilePath, audioBuffer)

  console.log(`Audio saved to ${outputFilePath}`)

  return outputFilePath
}
