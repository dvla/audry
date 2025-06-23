import { Selector } from '@microsoft/teams-ai'
import { ActivityContext } from '../internal/conversationHandlers'
import { transcriptToSpeech } from '../tts/textoSpeechGoogle'
import { getTranscript } from '../internal/utils/documentUtils'
import { warningCard, processingCard, transcriptToAudioCard } from '../internal/cards'

const FILE_TRIGGER_PATTERN = 'transcriptToAudio'

export class TranscriptToAudioHandler {
  triggerVerb: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TRIGGER_PATTERN

  /**
   * Handles the action when invoked from a button on an adaptive card.
   * @param context - The activity context containing the conversation and activity.
   * @returns An Adaptive Card indicating the processing state.
   */
  async handleActionInvoked(context: ActivityContext) {
    setImmediate(() => this.generateAudio(context))

    return processingCard('Generating audio... This may take a few minutes.')
  }

  /**
   * Generates audio from the transcript asynchronously.
   * @param context - The activity context containing the conversation and proactiveSendCard.
   * @returns A promise that resolves when the audio generation is complete.
   * @throws Will throw an error if the transcript generation fails.
   */
  async generateAudio({ proactiveSendCard, conversation }: ActivityContext): Promise<void> {
    try {
      const documentId = conversation.documentId
      const transcript = await getTranscript(documentId)
      const transcriptFilePath = await transcriptToSpeech(transcript, documentId)
      console.log('Audio generation complete:', transcriptFilePath)
      conversation.audioFilePath = transcriptFilePath
      await proactiveSendCard(transcriptToAudioCard('Audio generation completed successfully!', transcriptFilePath))
    } catch (error) {
      console.error('Error in async audio generation:', error)
      await proactiveSendCard(warningCard('Failed to generate audio from transcript'))
    }
  }
}
