import { Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api'
import {
  AudioConfig,
  SpeechConfig,
  SpeechSynthesisOutputFormat,
  SpeechSynthesizer,
} from 'microsoft-cognitiveservices-speech-sdk'
import * as path from 'path'

import { TTSModelConfig } from '../features/featureTTS'
import { Config } from '../internal/config'
import { SERVICE_NAME, log } from '../internal/logger'
import { generateUniqueFileName } from '../internal/utils/documentUtils'
import { DialogTurn, SSMLBuilder, SpeakingStyle } from './azureTTSTypes'
import { DEFAULT_CONFIG, EpisodeConfig, EpisodeVoices, LANGUAGE_CONFIG } from './episodeConfig'

let speechConfig: SpeechConfig | null = null

export const DEFAULT_VOICES = [EpisodeVoices.MATTHEW, EpisodeVoices.ELLIE]
// Predefined voice configurations for different episode voices
export const VOICE_CONFIGS = new Map<EpisodeVoices, { voiceId: string }>([
  [EpisodeVoices.MATTHEW, { voiceId: 'en-GB-OllieMultilingualNeural' }],
  [EpisodeVoices.ELLIE, { voiceId: 'en-GB-AdaMultilingualNeural' }],
  [EpisodeVoices.JAMIE, { voiceId: 'en-US-AdamMultilingualNeural' }],
  [EpisodeVoices.CLAIRE, { voiceId: 'en-US-AmandaMultilingualNeural' }],
  [EpisodeVoices.DANIEL, { voiceId: 'es-ES-TristanMultilingualNeural' }],
  [EpisodeVoices.SAMARA, { voiceId: 'zh-CN-XiaoxiaoMultilingualNeural' }],
  [EpisodeVoices.LUCY, { voiceId: 'it-IT-IsabellaMultilingualNeural' }],
  [EpisodeVoices.EMMA, { voiceId: 'es-MX-DaliaMultilingualNeural' }],
])

/**
 * Gets or creates the SpeechConfig for Azure TTS.
 * @returns SpeechConfig instance
 */
export const getSpeechConfig = async (): Promise<SpeechConfig> => {
  if (!speechConfig) {
    speechConfig = SpeechConfig.fromEndpoint(new URL(Config.SPEECH_SERVICE_ENDPOINT), Config.SPEECH_KEY)
    speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3
    log.debug('SpeechConfig initialized successfully')
  }
  return speechConfig
}

/**
 * Converts the provided transcript into speech using Azure TTS.
 * @param modelConfig TTS model configuration
 * @param transcript The transcript text to be converted to speech
 * @param episodeConfig The episode configuration for voice selection
 * @returns An object containing the output file name and path
 */
export async function transcriptToSpeech(
  modelConfig: TTSModelConfig,
  transcript: string,
  episodeConfig: EpisodeConfig = DEFAULT_CONFIG
): Promise<{ outputFileName: string; outputFilePath: string }> {
  const outputFileName = generateUniqueFileName('podcast') + '.mp3'
  const outputFilePath = path.join(Config.FILES_DIR, outputFileName)

  // Parse the transcript into speaker dialogue
  let dialogue = parseTranscriptToSpeakerDialogue(transcript, episodeConfig.voices)
  if (dialogue.length === 0) {
    // Fallback to single speaker if parsing fails
    dialogue = [
      {
        text: transcript,
        speaker: VOICE_CONFIGS.get(EpisodeVoices.MATTHEW).voiceId,
      },
    ]
  }

  const numOfChars = dialogue.reduce((sum, input) => sum + input.text.length, 0)
  log.info(`Azure speakSsmlAsync Request ${numOfChars} characters...`)

  // Generate SSML from the dialogue
  const languageCode = LANGUAGE_CONFIG[episodeConfig.language].code
  const builder = new SSMLBuilder(languageCode)
  for (const turn of dialogue) {
    builder.addVoiceSectionWithStyle(turn.speaker, { style: SpeakingStyle.CHEERFUL }, (b) => {
      b.addText(turn.text)
    })
  }
  const ssml = builder.build()

  // Synthesize speech using SSML
  const audioConfig: AudioConfig = AudioConfig.fromAudioFileOutput(outputFilePath)
  const tracer = trace.getTracer(SERVICE_NAME)
  return tracer.startActiveSpan('azure-tts', { kind: SpanKind.CLIENT }, async (span: Span) => {
    log.debug('Starting Azure TTS synthesis...')
    let synthesizer: SpeechSynthesizer
    const startTime = Date.now()
    try {
      synthesizer = new SpeechSynthesizer(await getSpeechConfig(), audioConfig)
      await new Promise<void>((resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          (result) => {
            if (result.errorDetails) {
              reject(new Error(result.errorDetails))
            } else {
              resolve()
            }
          },
          (error) => reject(new Error(error))
        )
      })

      log.info('Azure TTS synthesis completed successfully.')
      return {
        outputFileName: outputFileName,
        outputFilePath: outputFilePath,
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      log.error('Error generating with azure-tts:', error)
      span.recordException(error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
      throw error
    } finally {
      const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2)
      log.info(`Azure speakSsmlAsync Request ${numOfChars} characters, time: ${totalSeconds} seconds`)
      if (synthesizer) synthesizer.close()
      if (span) span.end()
    }
  })
}

export const parseTranscriptToSpeakerDialogue = (transcript: string, voices: EpisodeVoices[]): DialogTurn[] => {
  const dialogue: DialogTurn[] = []
  let currentSpeaker: string | null = null
  let currentText: string[] = []
  const speakerPattern = /^SPEAKER (\d+): (.*)/i

  const saveTurn = (speaker: string, text: string) => {
    const voiceConfig = VOICE_CONFIGS.get(voices[parseInt(speaker) - 1]) || VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)
    const dialogueInput = {
      text,
      speaker: voiceConfig.voiceId,
    }
    dialogue.push(dialogueInput)
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

  return dialogue
}
