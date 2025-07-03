import * as fs from 'fs'
import { Selector } from '@microsoft/teams-ai'
import { ActivityContext } from '../internal/conversationHandlers'
import { transcriptToSpeech } from '../tts/textoSpeechGoogle'
import { getTranscript } from '../internal/utils/documentUtils'
import { warningCard, processingCard, createFileConsentCard } from '../internal/cards'

const FILE_TRIGGER_PATTERN = 'transcriptToAudio'

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
      const { outputFileName, outputFilePath } = await transcriptToSpeech(transcript)

      console.log('Audio generation complete:', outputFilePath)
      // Create file consent card
      const fileConsentCard = createFileConsentCard(outputFilePath, outputFileName, 'Transcript audio')

      // Send file consent card as a raw attachment (not as an adaptive card)
      await proactiveSend({
        type: 'message',
        attachments: [fileConsentCard],
      })
    } catch (error) {
      console.error('Error in async audio generation:', error)
      await proactiveSend({
        type: 'message',
        attachments: [warningCard('Failed to generate audio from transcript')],
      })
    }
  }
}
