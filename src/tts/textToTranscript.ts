import { Config } from '../internal/config'
import { log } from '../internal/logger'
import { getGoogleClient } from './textoSpeechGoogle'

const MIME_TYPE = 'text/plain'

/**
 * Converts extracted text into a podcast-style transcript using Google's Gemini AI.
 * @param extractedText The text extracted from the document to be converted into a transcript.
 * @returns The generated transcript as a string.
 */
export const textToTranscript = async (prompt: string, extractedText: string) => {
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

  return responseText
}
