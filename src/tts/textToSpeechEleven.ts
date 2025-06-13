import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import * as path from 'path'
import { v7 as uuidv7 } from 'uuid'
import { Config } from '../internal/config'
import { promises as fs } from 'fs'

const MODEL_ID = 'eleven_multilingual_v2'
const OUTPUT_FORMAT = 'mp3_44100_128'
const MATTHEW_VOICE_ID = 'wUkGqD7qevNIshEdEC5s'
const MATTHEW_VOICE_SETTINGS = { speed: 1.04, stability: 0.4, similarityBoost: 1.0, useSpeakerBoost: true }
const ELLIE_VOICE_ID = 'lcMyyd2HUfFzxdCaC4Ta'
const ELLIE_VOICE_SETTINGS = { stability: 0.5, similarityBoost: 1.0, useSpeakerBoost: false }

let cloudClient: ElevenLabsClient | null = null

/**
 * Returns an instance of the ElevenLabsClient.
 *
 * This function uses a singleton pattern to create and return a client
 * for the ElevenLabs API.
 * @throws {Error} Throws an error if the ELEVENLABS_API_KEY is not set in the Config.
 * @returns {ElevenLabsClient} The ElevenLabs API client instance.
 */
const getClient = (): ElevenLabsClient => {
  if (!cloudClient) {
    const apiKey = Config.ELEVENLABS_API_KEY
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set')
    cloudClient = new ElevenLabsClient({ apiKey })
  }
  return cloudClient
}

/**
 * Represents a single turn in a conversation.
 *
 * @interface Turn
 * @property {string} speaker - The identifier for the speaker in this turn.
 * @property {string} text - The content spoken by the speaker in this turn.
 */
export interface Turn {
  speaker: string
  text: string
}

/**
 * Converts text to speech using ElevenLabs API and returns the audio as a Buffer.
 *
 * @param text - The text to convert to speech
 * @param voiceId - The identifier of the voice to use for speech synthesis
 * @param voiceSettings - Voice configuration settings (speed, stability, etc.)
 * @param ping - Optional callback function called on each chunk of audioStream
 * @returns Promise resolving to a Buffer containing the MP3 audio data, or null if conversion fails
 * @throws Will throw an error if the API request fails or times out
 */
const textToSpeechStream = async (
  text: string,
  voiceId: string,
  voiceSettings: any,
  ping?: () => void
): Promise<Buffer | null> => {
  const client = getClient()
  try {
    const audioStream = await client.textToSpeech.convert(
      voiceId,
      {
        text,
        modelId: MODEL_ID,
        outputFormat: OUTPUT_FORMAT,
        voiceSettings,
        optimizeStreamingLatency: 0,
      },
      {
        timeoutInSeconds: 180,
      }
    )
    const chunks: Buffer[] = []
    for await (const chunk of audioStream) {
      if (ping) ping()
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  } catch (error) {
    console.error('Failed to convert text to speech:', error)
    return null // Return null to indicate failure
  }
}

/**
 * Converts a series of conversation turns to speech using the Eleven Labs API.
 *
 * This function processes each turn in the conversation, generating audio with appropriate
 * voice characteristics based on the speaker.
 *
 * @param turns - Array of conversation turns containing speaker identification and text content
 * @param ping - Optional callback function called on each chunk of audioStream for each turn
 * @returns Promise resolving to the file path of the generated MP3 audio file
 * @throws Error if no audio buffers could be generated from the provided turns
 */
export const textToSpeech = async (turns: Turn[], ping?: () => void): Promise<string> => {
  const fileId = uuidv7()
  const mp3Path = path.join(Config.FILES_DIR, `eleven_${fileId}.mp3`)
  let buffers: Buffer[] = []

  // Loop through each turn and generate audio
  for (const turn of turns) {
    let buffer: Buffer | null = null
    const isMatthew = turn.speaker === '1'
    const voiceId = isMatthew ? MATTHEW_VOICE_ID : ELLIE_VOICE_ID
    const voiceSettings = isMatthew ? MATTHEW_VOICE_SETTINGS : ELLIE_VOICE_SETTINGS
    buffer = await textToSpeechStream(turn.text, voiceId, voiceSettings, ping)
    if (buffer && buffer.length > 0) buffers.push(buffer)
  }

  if (buffers.length === 0) {
    throw new Error('No audio buffers generated from the turns')
  }
  await writeFile(buffers, mp3Path)
  return mp3Path
}

/**
 * Writes audio data to a file.
 *
 * @param buffers - Array of audio buffer chunks to concatenate
 * @param outputPath - Path to the output audio file
 * @throws {Error} When the buffers array is empty
 * @returns Promise that resolves when the file has been written successfully
 */
export const writeFile = async (buffers: Buffer[], outputPath: string): Promise<void> => {
  if (buffers.length === 0) throw new Error('No audio buffers to concatenate')
  const combined = Buffer.concat(buffers)
  await fs.writeFile(outputPath, combined)
}
