import { Selector } from '@microsoft/teams-ai'

import { createFileConsentCard, processingCard, warningCard } from '../internal/cards'
import { ActivityContext } from '../internal/conversationHandlers'
import { log } from '../internal/logger'
import { getTranscript } from '../internal/utils/documentUtils'
import { transcriptToSpeech as ttsEleven } from '../tts/textToSpeechEleven'
import { transcriptToSpeech as ttsGoogle } from '../tts/textoSpeechGoogle'

const FILE_TRIGGER_PATTERN = 'transcriptToAudio'

// Temporary until we have a feature flag and config
const premiumAudio = false
export class TranscriptToAudioHandler {
  triggerVerb: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TRIGGER_PATTERN

  /**
   * Handles the action when invoked from a button on an adaptive card.
   * @param context - The activity context containing the conversation and activity.
   * @returns An Adaptive Card indicating the processing state.
   */
  async handleActionInvoked({ proactiveSend, conversation }: ActivityContext): Promise<void> {
    // Pass full context including state and turnContext to generateAudio
    setImmediate(() => this.generateAudio(proactiveSend, conversation))
    return processingCard('Generating audio... This may take a few minutes.')
  }

  /**
   * Generates audio from the transcript asynchronously.
   * @param context - The activity context containing the conversation and proactiveSendCard.
   * @returns A promise that resolves when the audio generation is complete.
   * @throws Will throw an error if the transcript generation fails.
   */
  async generateAudio(proactiveSend, conversation): Promise<void> {
    try {
      const documentId = conversation.documentId
      const transcript = await getTranscript(documentId)
      // Variants, flash, standard, premium
      const { outputFileName, outputFilePath } = await (premiumAudio ? ttsEleven : ttsGoogle)(transcript)

      log.info('Audio generation complete: ' + outputFilePath)
      // Create file consent card
      const fileConsentCard = createFileConsentCard(outputFilePath, outputFileName, 'Transcript audio')

      // Send file consent card as a raw attachment (not as an adaptive card)
      await proactiveSend({
        type: 'message',
        attachments: [fileConsentCard],
      })
    } catch (error) {
      log.error('Error in async audio generation:', error)
      await proactiveSend({
        type: 'message',
        attachments: [warningCard('Failed to generate audio from transcript')],
      })
    }
  }
}
