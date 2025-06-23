import errorCardJson from '../adaptiveCards/errorCard.json'
import warningCardJson from '../adaptiveCards/warningCard.json'
import processingCardJson from '../adaptiveCards/processingCard.json'
import textToTranscriptCardJson from '../adaptiveCards/textToTranscriptCard.json'
import transcriptToAudioCardJson from '../adaptiveCards/transcriptToAudioCard.json'
import * as ACData from 'adaptivecards-templating'

/**
 * Generates an error card with the provided message.
 * @param message The error message to display on the card.
 * @returns An Adaptive Card with the error message.
 */
export const errorCard = (message: string): any => {
  return new ACData.Template(errorCardJson).expand({
    $root: {
      message: message,
    },
  })
}

/**
 * Generates a warning card with the provided message.
 * @param message The warning message to display on the card.
 * @returns An Adaptive Card with the warning message.
 */
export const warningCard = (message: string): any => {
  return new ACData.Template(warningCardJson).expand({
    $root: {
      message: message,
    },
  })
}

/**
 * Generates a processing card with the provided message.
 * @param message The message to display on the card indicating processing status.
 * @returns An Adaptive Card indicating processing status.
 */
export const processingCard = (message: string) => {
  return new ACData.Template(processingCardJson).expand({
    $root: {
      message: message,
    },
  })
}

/**
 * Generates a text-to-transcript card with the provided title and transcript.
 * @param title The title of the card.
 * @param transcript The transcript text to display on the card.
 * @returns An Adaptive Card with the title and transcript.
 */
export const textToTranscriptCard = (title: string, transcript: string) => {
  return new ACData.Template(textToTranscriptCardJson).expand({
    $root: {
      title: title,
      transcript: transcript,
    },
  })
}

/**
 * Generates a transcript-to-audio card with the provided message and audio file path.
 * @param message The message to display on the card.
 * @param audioFilePath The file path of the generated audio.
 * @returns An Adaptive Card with the message and audio file path.
 */
export const transcriptToAudioCard = (message: string, audioFilePath: string) => {
  return new ACData.Template(transcriptToAudioCardJson).expand({
    $root: {
      message: message,
      audioFilePath: audioFilePath,
    },
  })
}
