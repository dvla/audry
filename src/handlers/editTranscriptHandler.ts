import { Selector } from '@microsoft/teams-ai'

import { textToTranscriptCard } from '../internal/cards'
import { ActivityContext } from '../internal/conversationHandlers'
import { getTranscripts } from '../internal/utils/documentUtils'

const FILE_TRIGGER_PATTERN = /^.*\bedit.*$/i

export class EditTranscriptHandler {
  triggerPatterns: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TRIGGER_PATTERN

  /**
   * Handler for the edit transcript command
   * @param sendCard - the function to send a card response
   * @param conversation - the conversation context containing documentId
   */
  async handleInvoked({ sendCard, conversation }: ActivityContext) {
    return await sendCard(textToTranscriptCard('Edit Transcript', await getTranscripts(conversation)))
  }
}
