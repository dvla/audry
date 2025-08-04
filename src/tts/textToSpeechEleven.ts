import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { VoiceSettings } from '@elevenlabs/elevenlabs-js/api/types/VoiceSettings'
import { promises as fs } from 'fs'
import * as path from 'path'

import { TTSModelConfig } from '../features/featureTTS'
import { Config } from '../internal/config'
import { log } from '../internal/logger'
import { generatePodcastFileName } from '../internal/utils/documentUtils'
import { EpisodeVoices } from './episodeConfig'

const OUTPUT_FORMAT = 'mp3_44100_128'

let cloudClient: ElevenLabsClient | null = null

export const DEFAULT_VOICES = [EpisodeVoices.MATTHEW, EpisodeVoices.ELLIE]
// Predefined voice configurations for different episode voices
const VOICE_CONFIGS = new Map<EpisodeVoices, { voiceId: string; voiceSettings: VoiceSettings }>([
  [
    EpisodeVoices.MATTHEW,
    {
      voiceId: 'wUkGqD7qevNIshEdEC5s',
      voiceSettings: {
        speed: 1.04,
        stability: 0.4,
        similarityBoost: 1.0,
        useSpeakerBoost: true,
      },
    },
  ],
  [
    EpisodeVoices.ELLIE,
    {
      voiceId: 'lcMyyd2HUfFzxdCaC4Ta',
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 1.0,
        useSpeakerBoost: false,
      },
    },
  ],
  [
    EpisodeVoices.DANIEL,
    {
      voiceId: 'onwK4e9ZLuTAKqWW03F9',
      voiceSettings: {
        speed: 1.04,
        similarityBoost: 1.0,
        useSpeakerBoost: true,
      },
    },
  ],
  [
    EpisodeVoices.JAMIE,
    {
      voiceId: 'BgdB8LkxV25DmnTgabLx',
      voiceSettings: {
        similarityBoost: 1.0,
        useSpeakerBoost: true,
      },
    },
  ],
])

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
  speaker: number
  text: string
}

/**
 * Converts text to speech using ElevenLabs API and returns the audio as a Buffer.
 *
 * @param text - The text to convert to speech
 * @param modelId - The identifier of the TTS model to use
 * @param voiceId - The identifier of the voice to use for speech synthesis
 * @param voiceSettings - Voice configuration settings (speed, stability, etc.)
 * @param ping - Optional callback function called on each chunk of audioStream
 * @returns Promise resolving to a Buffer containing the MP3 audio data, or null if conversion fails
 * @throws Will throw an error if the API request fails or times out
 */
const textToSpeechStream = async (
  text: string,
  modelId: string,
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
        modelId,
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
      chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  } catch (error) {
    log.error('Failed to convert text to speech.', error)
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
 * @param modelId - The identifier of the TTS model to use
 * @param ping - Optional callback function called on each chunk of audioStream for each turn
 * @returns Promise resolving to the file path of the generated MP3 audio file
 * @throws Error if no audio buffers could be generated from the provided turns
 */
export const textToSpeech = async (
  turns: Turn[],
  modelId: string,
  voices: EpisodeVoices[],
  ping?: () => void
): Promise<{ outputFileName: string; outputFilePath: string }> => {
  const outputFileName = generatePodcastFileName() + '.mp3'
  const outputFilePath = path.join(Config.FILES_DIR, outputFileName)
  let buffers: Buffer[] = []

  // Loop through each turn and generate audio
  for (const turn of turns) {
    let buffer: Buffer | null = null
    const voiceConfig = VOICE_CONFIGS.get(voices[turn.speaker - 1]) || VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)
    buffer = await textToSpeechStream(turn.text, modelId, voiceConfig.voiceId, voiceConfig.voiceSettings, ping)
    if (buffer && buffer.length > 0) buffers.push(buffer)
  }

  if (buffers.length === 0) {
    throw new Error('No audio buffers generated from the turns')
  }
  await writeFile(buffers, outputFilePath)
  return { outputFileName, outputFilePath }
}

/**
 * Converts a transcript string using the Eleven Labs API.
 *
 * This function parses the provided transcript into speaker turns, then processes each turn
 * using a Eleven Labs.
 *
 * @param modelConfig - The TTS model configuration to use.
 * @param transcript - The transcript text to convert to speech.
 * @returns A promise that resolves to the path of the saved audio file.
 */
export async function transcriptToSpeech(
  modelConfig: TTSModelConfig,
  transcript: string,
  voices: EpisodeVoices[] = DEFAULT_VOICES
): Promise<{ outputFileName: string; outputFilePath: string }> {
  const turns = parseTranscriptToSpeakerTurns(transcript)
  log.info(`Start audio Elevenlabs with model: ${modelConfig.model} and provider: ${modelConfig.provider}`)
  const startTime = Date.now()
  let i = 0
  if (turns && turns.length > 0) {
    log.debug(`Parsed ${turns.length} speaker turns from transcript`)
    const { outputFileName, outputFilePath } = await textToSpeech(turns, modelConfig.model, voices, () => {
      if (i % 20 === 0) {
        log.debug(`Processed ${i} chunks...`)
      }
      i++
    })
    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
    log.info(`Total audio generation time: ${totalSeconds} seconds`)
    return { outputFileName, outputFilePath }
  }
}

/**
 * Parses a transcript string into an array of speaker turns.
 *
 * The transcript should have lines formatted as "SPEAKER <number>: <text>", where each speaker's
 * utterance may span multiple lines. Lines not matching the speaker pattern are considered
 * continuations of the previous speaker's text.
 *
 * @param transcript - The transcript string to parse.
 * @returns An array of `Turn` objects, each containing a `speaker` identifier and the corresponding `text`.
 */
export const parseTranscriptToSpeakerTurns = (transcript: string): Turn[] => {
  const speakerTurns: Turn[] = []
  let currentSpeaker: string | null = null
  let currentText: string[] = []
  const speakerPattern = /^SPEAKER (\d+): (.*)/i

  for (const rawLine of transcript.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const match = line.match(speakerPattern)
    if (match) {
      // Save previous turn if exists
      if (currentSpeaker !== null) {
        speakerTurns.push({
          speaker: parseInt(currentSpeaker),
          text: currentText.join(' ').trim(),
        })
      }
      currentSpeaker = match[1]
      currentText = [match[2]]
    } else if (currentSpeaker !== null) {
      // Continuation of previous speaker
      currentText.push(line)
    }
  }
  // Add last turn
  if (currentSpeaker !== null && currentText.length > 0) {
    speakerTurns.push({
      speaker: parseInt(currentSpeaker),
      text: currentText.join(' ').trim(),
    })
  }
  return speakerTurns
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
