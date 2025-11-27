import { Selector } from '@microsoft/teams-ai'
import { ActivityTypes } from 'botbuilder'

import { processingCard, warningCard } from '../internal/cards'
import { ActivityContext } from '../internal/conversationHandlers'
import { log } from '../internal/logger'
import { EDITED_TRANSCRIPT_TEXT, TRANSCRIPT_TEXT, readFile, writeFile } from '../internal/utils/documentUtils'
import { reviewTranscript } from '../internal/utils/graphUtils'

const FILE_TRIGGER_PATTERN = /^.*\breview.*$/i
const FILE_VERB = 'reviewTranscript'

/**
 * Handles the review of a podcast transcript.
 */
export class ReviewHandler {
  triggerPatterns: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TRIGGER_PATTERN
  triggerVerb: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_VERB

  /**
   * Handles the action when invoked from a button on an adaptive card.
   * @param context - The activity context containing the conversation and activity.
   * @returns An Adaptive Card indicating the processing state.
   */
  async handleActionInvoked(context: ActivityContext) {
    setImmediate(() => this.reviewTranscript(context.proactiveSend, context.proactiveSendCard, context.conversation))
    return processingCard('Reviewing transcript...', 'You will receive feedback shortly.')
  }

  /**
   * Handles the invocation of the review handler.
   * @param context - The activity context.
   * @returns A promise that resolves when the handling is complete.
   */
  async handleInvoked({ send, conversation, proactiveSend, proactiveSendCard }: ActivityContext) {
    setImmediate(() => this.reviewTranscript(proactiveSend, proactiveSendCard, conversation))
    return await send({ type: ActivityTypes.Typing })
  }

  /**
   * Reviews the transcript, saves it and sends the feedback.
   * @returns A promise that resolves when the review is complete.
   */
  async reviewTranscript(proactiveSend, proactiveSendCard, conversation): Promise<void> {
    try {
      const documentId = conversation.documentId
      const transcript = await readFile(conversation.userId, documentId, TRANSCRIPT_TEXT)
      if (transcript) {
        const review = await reviewTranscript(transcript, documentId)
        if (review) {
          const british = `# British Grammar and Localisation Expert Feedback\n${review.bgFeedback}`.trim()
          const reviewer = `# DVLA Content Reviewer Feedback\n${review.crFeedback}`.trim()
          const emotion = `# Expressive Delivery Advisor Feedback\n${review.edaFeedback}`.trim()
          await proactiveSend(british)
          // Add a delay to ensure messages are sent one after the other
          await new Promise((resolve) => setTimeout(resolve, 500))
          await proactiveSend(reviewer)
          await new Promise((resolve) => setTimeout(resolve, 500))
          await proactiveSend(emotion)
          await new Promise((resolve) => setTimeout(resolve, 500))
          await writeFile(conversation.userId, documentId, EDITED_TRANSCRIPT_TEXT, review.finalTranscript)
        } else {
          await proactiveSend('No review for this transcript')
        }
      } else {
        log.warn('No transcript found for review.')
        await proactiveSendCard(warningCard('No transcript found for review.'))
      }
    } catch (error) {
      log.error('Error in review handler:', error)
      await proactiveSendCard(warningCard('Failed transcript review.'))
    }
  }
}
