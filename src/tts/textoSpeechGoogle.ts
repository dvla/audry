import { GenerateContentConfig, GoogleGenAI, SpeakerVoiceConfig, VoiceConfig } from '@google/genai'
import * as fs from 'node:fs'
import * as path from 'path'
import * as wav from 'wav'

import { TTSModelConfig } from '../features/featureTTS'
import { Config } from '../internal/config'
import { log } from '../internal/logger'
import { generatePodcastFileName } from '../internal/utils/documentUtils'
import { DEFAULT_CONFIG, EpisodeVoices } from './episodeConfig'

export const STYLE = `This is a short audio episode. 
ALL SPEAKERS should have a warm, and inviting British accent. 
The delivery should be conversational and engaging, with a dynamic rhythm that captures the listener's attention. 
The tone should be informative yet friendly. 
Here is the text to turn into speech:\n`

let cloudClient: GoogleGenAI | null = null

interface SaveWaveFileOptions {
  channels?: number
  rate?: number
  sampleWidth?: number
}

// Predefined voice configurations for different episode voices
const VOICE_CONFIGS = new Map<EpisodeVoices, VoiceConfig>([
  [EpisodeVoices.MATTHEW, { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }],
  [EpisodeVoices.ELLIE, { prebuiltVoiceConfig: { voiceName: 'Achernar' } }],
  [EpisodeVoices.JAMIE, { prebuiltVoiceConfig: { voiceName: 'Rasalgethi' } }],
  [EpisodeVoices.DANIEL, { prebuiltVoiceConfig: { voiceName: 'Charon' } }],
  [EpisodeVoices.CLAIRE, { prebuiltVoiceConfig: { voiceName: 'Callirrhoe' } }],
])

/**
 * Generates speaker voice configurations from an array of episode voices.
 *
 * @param voices - Array of episode voice types to be converted to speaker configurations
 * @returns Array of speaker voice configurations with sequential speaker names and corresponding voice settings
 */
const generateVoiceConfig = (voices: EpisodeVoices[]): SpeakerVoiceConfig[] => {
  let i = 1
  return voices.map((voice) => ({
    speaker: `Speaker ${i++}`,
    voiceConfig: VOICE_CONFIGS.get(voice) || VOICE_CONFIGS.get(EpisodeVoices.MATTHEW), // Default to Matthew if not found
  }))
}

/**
 * Configuration for generating speech with multiple speaker voices
 * @param voices - Array of episode voice types to be converted to speaker configurations
 * @param seed - A seed value for randomization, used to help with consistent audio generation
 * @param modelConfig - The TTS model configuration to use
 * @returns The configuration object for generating speech with multiple speaker voices
 */
export const generateConfig = (
  voices: EpisodeVoices[],
  seed: number,
  modelConfig: TTSModelConfig
): GenerateContentConfig => {
  return {
    responseModalities: ['AUDIO'],
    speechConfig: {
      languageCode: 'en-GB',
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: generateVoiceConfig(voices),
      },
    },
    temperature: modelConfig.temperature,
    abortSignal: AbortSignal.timeout(8 * 60 * 1000), // 8 minutes
    seed,
  }
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
 * @param modelConfig - The TTS model configuration to use.
 * @param transcript - The transcript text to convert to speech.
 * @param voices - The array of voices to use for the speech synthesis.
 * @returns A promise that resolves to the path of the saved audio file.
 */
export async function transcriptToSpeech(
  modelConfig: TTSModelConfig,
  transcript: string,
  voices: EpisodeVoices[] = DEFAULT_CONFIG.voices
): Promise<{ outputFileName: string; outputFilePath: string }> {
  const transcriptChunks = splitTranscript(transcript)

  log.info(
    `Start audio generation with model: ${modelConfig.model} and provider: ${modelConfig.provider} and temperature: ${modelConfig.temperature}`
  )
  const startTime = Date.now()
  const seed = parseInt(startTime.toString().slice(-8))
  const generatedConfiguration = generateConfig(voices, seed, modelConfig)
  const audioResponse = await Promise.all(
    transcriptChunks.map((chunk) => processChunks(chunk, generatedConfiguration, modelConfig))
  )
  const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
  log.info(`Total audio generation time: ${totalSeconds} seconds`)

  const audioData = audioResponse.filter((a) => a?.length > 0)
  if (audioData.length === 0) {
    throw new Error(`No audio data generated from ${modelConfig.model}`)
  }
  const audioBuffers = Buffer.concat(audioData.map((data) => Buffer.from(data, 'base64')))
  const outputFileName = generatePodcastFileName() + '.wav'
  const outputFilePath = path.join(Config.FILES_DIR, outputFileName)
  log.debug('Saving audio file to ' + outputFilePath)
  await saveWaveFile(outputFilePath, audioBuffers)
  return { outputFileName, outputFilePath }
}

/**
 * Splits a transcript into smaller chunks based on line breaks
 * @param transcript The full transcript text
 * @param maxLines The maximum number of lines allowed in the transcript
 * @param maxLinesPerChunk The maximum number of lines per chunk
 * @returns The transcript split into chunks of a maximum number of lines
 */
export const splitTranscript = (
  transcript: string,
  maxLines = +Config.MAX_NUMBER_OF_LINES,
  maxLinesPerChunk = +Config.LINES_PER_CHUNK
): string[] => {
  let sentences = transcript.split('\n').filter((line) => line.trim() !== '')
  // Check if the number of sentences exceeds the maximum allowed lines
  if (sentences.length > maxLines) {
    log.warn(`Transcript (${sentences.length}) exceeds maximum number of lines (${maxLines}).`)
    sentences = sentences.slice(0, maxLines)
  }

  const chunks: string[] = []
  let currentChunk = ''

  for (let i = 0; i < sentences.length; i++) {
    currentChunk += (currentChunk ? '\n' : '') + sentences[i]
    if ((i + 1) % maxLinesPerChunk === 0 || i === sentences.length - 1) {
      chunks.push(currentChunk)
      currentChunk = ''
    }
  }

  log.info(`Transcript split into ${chunks.length} chunks. Creating audio...`)
  return chunks
}

/**
 * Processes a single chunk of text to generate speech using Google's Gemini TTS API.
 * @param chunk The text chunk to process.
 * @param generateConfiguration The configuration for generating content.
 * @param modelConfig The TTS model configuration to use.
 * @returns A promise that resolves to the base64 encoded audio data.
 */
export const processChunks = async (
  chunk: string,
  generateConfiguration: GenerateContentConfig,
  modelConfig: TTSModelConfig
) => {
  const ai = getGoogleClient()
  const prompt = `${STYLE}\n\n${chunk}`
  const chunkStartTime = Date.now()
  let data

  try {
    const response = await ai.models.generateContent({
      model: modelConfig.model,
      contents: [{ parts: [{ text: prompt }] }],
      config: generateConfiguration,
    })

    log.debug(`- totalTokenCount: ${response.usageMetadata?.totalTokenCount}`)

    data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!data) {
      log.warn('No audio data received from the API: ' + JSON.stringify(response.candidates?.[0]))
    }
  } catch (error) {
    log.error('Error generating audio chunk:', error)
  } finally {
    const chunkSeconds = ((Date.now() - chunkStartTime) / 1000).toFixed(2)
    log.debug(`Chunk processed in ${chunkSeconds} seconds`)
  }
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
    writer.on('done', resolve)
    writer.on('error', reject)
    writer.write(pcmData) // Write audio data
    writer.end()
  })
}
