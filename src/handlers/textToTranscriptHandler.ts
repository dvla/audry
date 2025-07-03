import { Selector } from '@microsoft/teams-ai'

import { processingCard, textToTranscriptCard, warningCard } from '../internal/cards'
import { ActivityContext } from '../internal/conversationHandlers'
import { log } from '../internal/logger'
import { getExtractedText, writeTranscript } from '../internal/utils/documentUtils'
import { textToTranscript } from '../tts/textToTranscript'

const FILE_TRIGGER_PATTERN = 'textToTranscript'

/**
 * TextToTranscriptActionHandler is a class that handles the action of converting text to a transcript.
 */
export class TextToTranscriptHandler {
  triggerVerb: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TRIGGER_PATTERN

  /**
   * Handles the action when invoked from a button on an adaptive card.
   * @param context - The activity context containing the conversation and activity.
   * @returns An Adaptive Card indicating the processing state.
   */
  async handleActionInvoked(context: ActivityContext) {
    setImmediate(async () => this.generateTranscript(context))

    return processingCard('Generating transcript...')
  }

  /**
   * Generates a transcript from the extracted text.
   * @param context - The activity context containing the conversation and proactiveSendCard.
   * @return A promise that resolves when the transcript is generated and sent as an Adaptive Card.
   */
  async generateTranscript({ proactiveSendCard, conversation }: ActivityContext): Promise<void> {
    try {
      // Get the document ID from the conversation
      const documentId = conversation.documentId
      // Get the extracted text from the document
      const extractedText = await getExtractedText(documentId)
      // Generate a transcript from the extracted text
      const transcriptText = await textToTranscript(extractedText)
      // Write the transcript to a file
      await writeTranscript(transcriptText, documentId)
      // Send a proactive card with the transcript
      await proactiveSendCard(textToTranscriptCard('Transcript Created', transcriptText))
    } catch (error) {
      log.error('Error generating transcript:', error)
      await proactiveSendCard(warningCard('The transcript could not be generated. Please try again later.'))
    }
  }
}
