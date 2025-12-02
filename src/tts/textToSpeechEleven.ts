import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { DialogueInput } from '@elevenlabs/elevenlabs-js/api'
import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api'
import { promises as fs } from 'fs'
import { Span } from 'node_modules/@opentelemetry/api/build/src/trace/span'
import * as path from 'path'

import { TTSModelConfig } from '../features/featureTTS'
import { Config } from '../internal/config'
import { SERVICE_NAME, log } from '../internal/logger'
import { generateUniqueFileName } from '../internal/utils/documentUtils'
import { EpisodeConfig, EpisodeIntro, EpisodeOutro, EpisodeVoices, LANGUAGE_CONFIG } from './episodeConfig'

const OUTPUT_FORMAT = 'mp3_44100_128'
const MAX_CHAR_COUNT = 3000 - 300 // Leave large buffer for any extra tokens

let cloudClient: ElevenLabsClient | null = null

export const DEFAULT_VOICES = [EpisodeVoices.ELLIE, EpisodeVoices.DANIEL]
// Predefined voice configurations for different episode voices
export const VOICE_CONFIGS = new Map<EpisodeVoices, { voiceId: string }>([
  [EpisodeVoices.MATTHEW, { voiceId: 'wUkGqD7qevNIshEdEC5s' }],
  [EpisodeVoices.ELLIE, { voiceId: 'ZF6FPAbjXT4488VcRRnw' }], // Amelia
  [EpisodeVoices.JAMIE, { voiceId: 'llNlEi50DSCIEuoOIaH7' }], // Jamie
  [EpisodeVoices.CLAIRE, { voiceId: 'RILOU7YmBhvwJGDGjNmP' }], // Jane
  [EpisodeVoices.DANIEL, { voiceId: 'NNl6r8mD7vthiJatiJt1' }], // Bradford
  [EpisodeVoices.SAMARA, { voiceId: '19STyYD15bswVz51nqLf' }], // Samara X
  [EpisodeVoices.LUCY, { voiceId: 'lcMyyd2HUfFzxdCaC4Ta' }], // Lucy
  [EpisodeVoices.EMMA, { voiceId: 'YPbk892xlMnFoVOkxyGD' }], // BLONDIE News reporter
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
  languageCode: string,
  ping?: () => void
): Promise<Buffer | null> => {
  const client = getClient()
  const numOfChars = dialogue.reduce((sum, input) => sum + input.text.length, 0)
  const dialogueChars = JSON.stringify(dialogue).length
  log.debug(`Chunk request ${numOfChars} text characters...`)
  log.debug(`Chunk request ${dialogueChars} dialog characters...`)
  const startTime = Date.now()

  const tracer = trace.getTracer(SERVICE_NAME)
  return tracer.startActiveSpan('eleven-labs-tts-chunk', { kind: SpanKind.CLIENT }, async (span: Span) => {
    try {
      const context = span.spanContext()
      span.setAttribute('model', modelId)
      span.setAttribute('textLength', numOfChars)
      span.setAttribute('chunkLength', dialogueChars)
      const audio = await client.textToDialogue.stream(
        {
          inputs: dialogue,
          modelId,
          seed,
          outputFormat: OUTPUT_FORMAT,
          settings: voiceSettings,
          languageCode,
        },
        {
          timeoutInSeconds: 60 * 5, // 5 minutes timeout
        }
      )
      const chunks: Buffer[] = []
      for await (const chunk of audio) {
        if (ping) ping()
        chunks.push(Buffer.from(chunk))
      }
      return Buffer.concat(chunks)
    } catch (error) {
      log.error('Failed to convert text to speech.', error)
      span.recordException(error as Error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
      return null // Return null to indicate failure
    } finally {
      const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
      log.debug(`Chunk request ${numOfChars} characters, time: ${totalSeconds} seconds`)
      if (span) span.end()
    }
  })
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
  audioEffects: [Buffer | undefined, Buffer | undefined],
  modelId: string,
  languageCode: string,
  ping?: () => void
): Promise<{ outputFileName: string; outputFilePath: string }> => {
  const outputFileName = generateUniqueFileName('podcast') + '.mp3'
  const outputFilePath = path.join(Config.FILES_DIR, outputFileName)
  let span: Span | undefined
  let nonEmptyBuffers: Buffer[]
  if (log.isDebugEnabled()) {
    for (let i = 0; i < dialogue.length; i++) {
      let dialogueFilePath = path.join(Config.FILES_DIR, seed + '_' + i + '_dialogue.txt')
      log.debug(`Writing dialogue ${i} to ${dialogueFilePath}`)
      await fs.writeFile(dialogueFilePath, JSON.stringify(dialogue[i], null, 2))
    }
  }

  const tracer = trace.getTracer(SERVICE_NAME)
  await tracer.startActiveSpan('eleven-labs-tts', { kind: SpanKind.CLIENT }, async (span: Span) => {
    try {
      span.setAttribute('model', modelId)
      const buffers: Buffer[] = await Promise.all(
        dialogue.map((chunk) =>
          textToSpeechStream(
            chunk,
            seed,
            modelId,
            {
              stability: 0.5,
              useSpeakerBoost: false,
            },
            languageCode,
            ping
          )
        )
      )
      const audioBuffers = [audioEffects[0], ...buffers, audioEffects[1]]
      nonEmptyBuffers = audioBuffers.filter((buffer) => buffer?.length > 0)
      if (nonEmptyBuffers.length === 0) {
        throw new Error('No audio buffers generated from eleven textToSpeech')
      }
    } finally {
      if (span) span.end()
    }
  })

  if (log.isDebugEnabled()) {
    for (let i = 0; i < nonEmptyBuffers.length; i++) {
      const buffer = nonEmptyBuffers[i]
      let debugFilePath = path.join(Config.FILES_DIR, seed + '_' + i + '_' + outputFileName)
      log.debug(`Writing chunk ${i} with ${buffer.length} bytes to ${debugFilePath}`)
      await fs.writeFile(debugFilePath, buffer)
    }
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
  { voices, intro_effect, outro_effect, language }: EpisodeConfig
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
    const audioEffects = await getAudioEffects(intro_effect, outro_effect)
    const { outputFileName, outputFilePath } = await textToSpeech(
      dialogue,
      seed,
      audioEffects,
      modelConfig.model,
      LANGUAGE_CONFIG[language].shortCode,
      () => {
        if (i % 100 === 0) {
          log.debug(`Processed ${i} chunks...`)
        }
        i++
      }
    )
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
    const dialogueLength = JSON.stringify(dialogueInput).length

    if (charCount + dialogueLength < MAX_CHAR_COUNT) {
      currentInputs.push(dialogueInput)
      charCount += dialogueLength
    } else {
      // Add a pause at the end of dialogue chunk
      currentInputs.push({
        text: '[pauses] hmm...',
        voiceId: voiceConfig.voiceId,
      })
      dialogue.push(currentInputs)
      currentInputs = [dialogueInput]
      charCount = dialogueLength
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

/** Loads intro and outro audio effects from files.
 *
 * @param introEffect - The intro effect to load (e.g., 'HAPPY10')
 * @param outroEffect - The outro effect to load (e.g., 'SYNTH10')
 * @returns A promise that resolves to a tuple containing the intro and outro audio buffers, or undefined if not found
 */
export const getAudioEffects = async (
  introEffect: EpisodeIntro | undefined,
  outroEffect: EpisodeOutro | undefined
): Promise<[Buffer | undefined, Buffer | undefined]> => {
  let introBuffer, outroBuffer
  try {
    if (introEffect) {
      const audioRoot = Config.AUDIO_FILES_DIR
      if (!audioRoot) throw new Error('AUDIO_FILES_DIR not set')
      const intro = path.join(Config.AUDIO_FILES_DIR, `${introEffect.toLowerCase()}.mp3`)
      introBuffer = await fs.readFile(intro)
    }
    if (outroEffect) {
      const outro = path.join(Config.AUDIO_FILES_DIR, `${outroEffect.toLowerCase()}.mp3`)
      outroBuffer = await fs.readFile(outro)
    }
  } catch (error) {
    log.error('Failed to load audio effects', error)
  }
  return [introEffect ? introBuffer : undefined, outroEffect ? outroBuffer : undefined]
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
