import { AdaptiveCard } from '@microsoft/teams-ai'
import { TurnContext } from 'botbuilder'
import * as ACData from 'adaptivecards-templating'
import responseCard from '../adaptiveCards/extractTextActionResponse.json'
import { ApplicationTurnState } from 'src/internal/interface'

const EXTRACT_TEXT_TRIGGER_VERB = 'extractText'

export class ExtractTextActionHandler {
  triggerVerb = EXTRACT_TEXT_TRIGGER_VERB

  async handleActionInkvoked(
    context: TurnContext,
    state: ApplicationTurnState,
    actionData: any
  ): Promise<string | AdaptiveCard> {
    //TODO: Implement the logic to extract text from the uploaded file
    console.log('File Path from State:', state.conversation.documentPath)
    const cardJson = new ACData.Template(responseCard).expand({
      $root: {
        title: 'Text Extracted',
        body: 'Congratulations! Text has been extracted successfully.',
      },
    })
    return cardJson as AdaptiveCard
  }
}
