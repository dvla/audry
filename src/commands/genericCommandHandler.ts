import { Selector } from '@microsoft/teams-ai'
import { Activity, TurnContext } from 'botbuilder'
import { ApplicationTurnState } from '../internal/conversationHandlers'

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
    console.log(`App received message: ${context.activity.text}`)

    const response =
      'Hi there! to create a Podcast follow the  steps: \n\n' +
      '1. Click on the Plus Icon (+)\n' +
      "2. Click on 'Attach files'\n" +
      "3. Click on 'Local device'\n" +
      '4. Select your file from your computer\n' +
      "5. Click on 'Send'\n\n" +
      "That's it! Your file will be uploaded and processed. Feel free to ask for help anytime you need it!"

    return response
  }
}
