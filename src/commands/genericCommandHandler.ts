import { Selector } from '@microsoft/teams-ai'
import { Activity, TurnContext } from 'botbuilder'

import { ApplicationTurnState } from '../internal/conversationHandlers'
import { log } from '../internal/logger'

/**
 * The `GenericCommandHandler` responds
 * with a message when a user sends a generic command
 */
export class GenericCommandHandler {
  triggerPatterns: string | RegExp | Selector | (string | RegExp | Selector)[] = new RegExp(/^.+$/)

  async handleCommandReceived(
    context: TurnContext,
    state: ApplicationTurnState
  ): Promise<string | Partial<Activity> | void> {
    log.debug(`App received message: ${context.activity.text}`)

    const response =
      'Hi there! to create a Podcast follow these steps: \n\n' +
      '1. Click on the Plus Icon (+)\n' +
      "2. Click on 'Attach file'\n" +
      '3. Upload from this device\n' +
      "4. Click on 'Send' icon\n\n" +
      "That's it! Your file will be uploaded for text extraction."

    return response
  }
}
