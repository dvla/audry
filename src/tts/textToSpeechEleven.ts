import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { DialogueInput } from '@elevenlabs/elevenlabs-js/api'
import { promises as fs } from 'fs'
import * as path from 'path'

import { TTSModelConfig } from '../features/featureTTS'
import { Config } from '../internal/config'
import { log } from '../internal/logger'
import { generatePodcastFileName } from '../internal/utils/documentUtils'
import { EpisodeVoices } from './episodeConfig'

const OUTPUT_FORMAT = 'mp3_44100_128'
const MAX_CHAR_COUNT = 3000 - 15 // Leave some buffer for any extra tokens

let cloudClient: ElevenLabsClient | null = null

export const DEFAULT_VOICES = [EpisodeVoices.ELLIE, EpisodeVoices.DANIEL]
// Predefined voice configurations for different episode voices
export const VOICE_CONFIGS = new Map<EpisodeVoices, { voiceId: string }>([
  [EpisodeVoices.MATTHEW, { voiceId: 'wUkGqD7qevNIshEdEC5s' }],
  [EpisodeVoices.ELLIE, { voiceId: '19STyYD15bswVz51nqLf' }], // Samara X
  [EpisodeVoices.DANIEL, { voiceId: 'NNl6r8mD7vthiJatiJt1' }], // Bradford
  [EpisodeVoices.JAMIE, { voiceId: 'gU0LNdkMOQCOrPrwtbee' }], // Football
  [EpisodeVoices.CLAIRE, { voiceId: 'RILOU7YmBhvwJGDGjNmP' }], // Jane
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
 * Converts text to speech using ElevenLabs API and returns the audio as a Buffer.
 *
 * @param dialogue - Array of dialogue inputs containing text and voice IDs
 * @param seed - The seed value for the speech synthesis
 * @param modelId - The identifier of the TTS model to use
 * @param voiceSettings - Voice configuration settings (speed, stability, etc.)
 * @param ping - Optional callback function called on each chunk of audioStream
 * @returns Promise resolving to a Buffer containing the MP3 audio data, or null if conversion fails
 * @throws Will throw an error if the API request fails or times out
 */
const textToSpeechStream = async (
  dialogue: DialogueInput[],
  seed: number,
  modelId: string,
  voiceSettings: any,
  ping?: () => void
): Promise<Buffer | null> => {
  const client = getClient()
  const numOfChars = dialogue.reduce((sum, input) => sum + input.text.length, 0)
  log.debug(`Chunk request ${numOfChars} characters...`)
  const startTime = Date.now()
  try {
    const audioStream = await client.textToDialogue.stream(
      {
        inputs: dialogue,
        modelId,
        seed,
        outputFormat: OUTPUT_FORMAT,
        settings: voiceSettings,
      },
      {
        timeoutInSeconds: 60 * 5, // 5 minutes timeout
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
  } finally {
    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
    log.debug(`Chunk request ${numOfChars} characters, time: ${totalSeconds} seconds`)
  }
}

/**
 * Converts a series of conversation turns to speech using the Eleven Labs API.
 *
 * This function processes each turn in the conversation, generating audio with appropriate
 * voice characteristics based on the speaker.
 *
 * @param dialogue - An array of dialogue inputs, where each input contains text and a voiceId
 * @param seed - The seed value for the speech synthesis
 * @param modelId - The identifier of the TTS model to use
 * @param ping - Optional callback function called on each chunk of audioStream for each turn
 * @returns Promise resolving to the file path of the generated MP3 audio file
 * @throws Error if no audio buffers could be generated from the provided turns
 */
export const textToSpeech = async (
  dialogue: DialogueInput[][],
  seed: number,
  modelId: string,
  ping?: () => void
): Promise<{ outputFileName: string; outputFilePath: string }> => {
  const outputFileName = generatePodcastFileName() + '.mp3'
  const outputFilePath = path.join(Config.FILES_DIR, outputFileName)

  const buffers: Buffer[] = await Promise.all(
    dialogue.map((chunk) =>
      textToSpeechStream(
        chunk,
        seed,
        modelId,
        {
          stability: 1.0,
          useSpeakerBoost: true,
        },
        ping
      )
    )
  )
  const nonEmptyBuffers = buffers.filter((buffer) => buffer.length > 0)
  if (nonEmptyBuffers.length === 0) {
    throw new Error('No audio buffers generated from eleven textToSpeech')
  }
  await writeFile(nonEmptyBuffers, outputFilePath)
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
  let dialogue = parseTranscriptToSpeakerDialogue(transcript, voices)
  if (dialogue.length === 0) {
    dialogue = parseTranscriptToSimpleDialogue(transcript, voices)
  }
  log.info(`Start audio Elevenlabs with model: ${modelConfig.model} and provider: ${modelConfig.provider}`)
  if (dialogue && dialogue.length > 0) {
    log.info(`We will make ${dialogue.length} requests`)
    const startTime = Date.now()
    const seed = parseInt(startTime.toString().slice(-8))
    let i = 0
    const { outputFileName, outputFilePath } = await textToSpeech(dialogue, seed, modelConfig.model, () => {
      if (i % 100 === 0) {
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
export const parseTranscriptToSpeakerDialogue = (transcript: string, voices: EpisodeVoices[]): DialogueInput[][] => {
  const dialogue: DialogueInput[][] = [[]]
  let charCount = 0
  let currentInputs: DialogueInput[] = []
  let currentSpeaker: string | null = null
  let currentText: string[] = []
  const speakerPattern = /^SPEAKER (\d+): (.*)/i

  const saveTurn = (speaker: string, text: string) => {
    const voiceConfig = VOICE_CONFIGS.get(voices[parseInt(speaker) - 1]) || VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)
    const dialogueInput = {
      text,
      voiceId: voiceConfig.voiceId,
    }

    if (charCount + text.length < MAX_CHAR_COUNT) {
      currentInputs.push(dialogueInput)
      charCount += text.length
    } else {
      dialogue.push(currentInputs)
      currentInputs = [dialogueInput]
      charCount = text.length
    }
  }

  for (const rawLine of transcript.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const match = line.match(speakerPattern)
    if (match) {
      // Save previous turn if exists
      if (currentSpeaker !== null) {
        const text = currentText.join(' ').trim()
        saveTurn(currentSpeaker, text)
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
    const text = currentText.join(' ').trim()
    saveTurn(currentSpeaker, text)
  }

  // Add the final currentInputs if it has content
  if (currentInputs.length > 0) {
    dialogue.push(currentInputs)
  }

  // Filter out empty arrays
  return dialogue.filter((a) => a.length > 0)
}

/**
 * Fallback parser: Uses transcript with 1 voice.
 */
export const parseTranscriptToSimpleDialogue = (
  transcript: string,
  voices: EpisodeVoices[]
): DialogueInput[][] | undefined => {
  const voiceConfig = VOICE_CONFIGS.get(voices[0]) || VOICE_CONFIGS.get(EpisodeVoices.DANIEL)
  if (transcript && transcript.length < MAX_CHAR_COUNT) {
    return [
      [
        {
          text: transcript,
          voiceId: voiceConfig.voiceId,
        },
      ],
    ]
  }
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
