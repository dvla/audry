import { Selector } from '@microsoft/teams-ai'
import fs from 'fs/promises'

import { createFileConsentCard, processingCard, warningCard } from '../internal/cards'
import { ActivityContext } from '../internal/conversationHandlers'
import { log } from '../internal/logger'
import { SHOW_NOTES, TRANSCRIPT_TEXT, readFile, writeFile } from '../internal/utils/documentUtils'
import { generateShowNotes } from '../internal/utils/graphUtils'
import { DEFAULT_CONFIG } from '../tts/episodeConfig'
import { transcriptToAudioProvider } from '../tts/textToTranscript'

const FILE_TRIGGER_PATTERN = 'transcriptToAudio'

export class TranscriptToAudioHandler {
  triggerVerb: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TRIGGER_PATTERN

  /**
   * Handles the action when invoked from a button on an adaptive card.
   * @param context - The activity context containing the conversation and activity.
   * @returns An Adaptive Card indicating the processing state.
   */
  async handleActionInvoked({ proactiveSend, proactiveSendCard, conversation }: ActivityContext): Promise<void> {
    // Pass full context including state and turnContext to generateAudio
    setImmediate(() => this.generateAudio(proactiveSend, proactiveSendCard, conversation))
    return processingCard('Generating audio... This may take a few minutes.')
  }

  /**
   * Generates audio from the transcript asynchronously.
   * @param context - The activity context containing the conversation and proactiveSendCard.
   * @returns A promise that resolves when the audio generation is complete.
   * @throws Will throw an error if the transcript generation fails.
   */
  async generateAudio(proactiveSend, proactiveSendCard, conversation): Promise<void> {
    try {
      const documentId = conversation.documentId
      const transcript = await readFile(conversation.userId, documentId, TRANSCRIPT_TEXT)
      const config = conversation.config || DEFAULT_CONFIG
      const transcriptToAudio = await transcriptToAudioProvider(config)
      const { outputFileName, outputFilePath } = await transcriptToAudio(transcript)

      log.info('Audio generation complete: ' + outputFilePath)
      // Create file consent card
      const fileConsentCard = createFileConsentCard(outputFilePath, outputFileName, 'Transcript audio')

      // Send file consent card as a raw attachment (not as an adaptive card)
      await proactiveSend({
        type: 'message',
        attachments: [fileConsentCard],
      })
      await writeFile(conversation.userId, conversation.documentId, outputFileName, await fs.readFile(outputFilePath))
      const showNotes = await generateShowNotes(transcript, documentId)
      if (showNotes) {
        await writeFile(conversation.userId, conversation.documentId, SHOW_NOTES, JSON.stringify(showNotes, null, 2))
      }
    } catch (error) {
      log.error('Error in async audio generation:', error)
      await proactiveSendCard(warningCard('Failed to generate audio from transcript'))
    }
  }
}
