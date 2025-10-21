import { SpanKind, trace } from '@opentelemetry/api'
import { Span } from 'node_modules/@opentelemetry/api/build/src/trace/span'

import { Providers, getTTSModelConfig } from '../features/featureTTS'
import { Config } from '../internal/config'
import { SERVICE_NAME, log } from '../internal/logger'
import { EpisodeConfig } from './episodeConfig'
import { promptForTranscript } from './promptForTranscript'
import { transcriptToSpeech as ttsEleven } from './textToSpeechEleven'
import { getGoogleClient, transcriptToSpeech as ttsGoogle } from './textoSpeechGoogle'

const MIME_TYPE = 'text/plain'

/**
 * Converts the provided text into a transcript format using the specified episode configuration.
 *
 * @param text - The input text to be converted into a transcript.
 * @param episodeConfig - The configuration object for the episode, used to generate the system prompt.
 * @returns A promise that resolves to the transcript generated from the input text.
 */
export const toTranscript = async (text: string, episodeConfig: EpisodeConfig) => {
  const systemPrompt = promptForTranscript(episodeConfig)
  log.debug('Generating transcript with prompt:\n' + systemPrompt)
  return textToTranscript(systemPrompt, text)
}

/**
 * Converts extracted text into a podcast-style transcript using Google's Gemini AI.
 * @param extractedText The text extracted from the document to be converted into a transcript.
 * @returns The generated transcript as a string.
 */
export const textToTranscript = async (prompt: string, extractedText: string) => {
  const tracer = trace.getTracer(SERVICE_NAME)
  return tracer.startActiveSpan('text-to-transcript', { kind: SpanKind.CLIENT }, async (span: Span) => {
    const ai = getGoogleClient()
    const response = await ai.models.generateContentStream({
      model: Config.GEMINI_MODEL,
      config: {
        responseMimeType: MIME_TYPE,
        systemInstruction: prompt,
      },
      contents: extractedText,
    })

    // Process the streamed response
    let responseText = ''
    for await (const chunk of response) {
      log.debug(chunk.text)
      responseText += chunk.text
    }

    span.end()
    return responseText
  })
}

/**
 * Provides a function to convert a transcript to audio using the appropriate TTS provider.
 * @returns A function that takes a transcript and returns the audio file path.
 */
export const transcriptToAudioProvider = async (episodeConfig: EpisodeConfig): Promise<any> => {
  const modelConfig = (await getTTSModelConfig())?.configuration
  let toAudioProvider
  switch (modelConfig.provider) {
    case Providers.ELEVEN_LABS:
      toAudioProvider = (transcript: string) => ttsEleven(modelConfig, transcript, episodeConfig)
      break
    case Providers.GOOGLE:
    // Google is the default provider
    default:
      toAudioProvider = (transcript: string) => ttsGoogle(modelConfig, transcript, episodeConfig)
  }
  return toAudioProvider
}
