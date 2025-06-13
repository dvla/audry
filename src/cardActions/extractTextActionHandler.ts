import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import * as ACData from 'adaptivecards-templating'
import responseCard from '../adaptiveCards/extractTextActionResponse.json'
import { AdaptiveCard } from '@microsoft/teams-ai'
import { TurnContext, ActivityTypes } from 'botbuilder'
import { ApplicationTurnState } from 'src/internal/interface'
import { extractTextFromPdf } from '../internal/utils/pdfUtils'

const EXTRACT_TEXT_TRIGGER_VERB = 'extractText'
const MAX_PAGES = 80

export class ExtractTextActionHandler {
  triggerVerb = EXTRACT_TEXT_TRIGGER_VERB

  async handleActionInkvoked(
    context: TurnContext,
    state: ApplicationTurnState,
    actionData: any
  ): Promise<string | AdaptiveCard> {
    const filePath = state.conversation.documentPath
    const documentId = state.conversation.documentId // <-- get the UUID
    if (!filePath) {
      return 'No PDF file found to extract text from. Please upload a PDF first.'
    }
    if (!documentId) {
      return 'No document ID found. Please upload a PDF first.'
    }

    // Send typing indicator
    await context.sendActivity({ type: ActivityTypes.Typing })

    try {
      const extractedText = await extractTextFromPdf(filePath, MAX_PAGES)
      // Use the same UUID for the extracted file name
      const tempFilePath = path.join(os.tmpdir(), `extracted_${documentId}.txt`)
      await fs.writeFile(tempFilePath, extractedText, 'utf8')
      console.log('Extracted text saved to:', tempFilePath)

      const cardJson = new ACData.Template(responseCard).expand({
        $root: {
          title: 'Text Extracted',
          body: `Extracted text from up to ${MAX_PAGES} page(s) and saved to: ${tempFilePath}`,
        },
      })
      return cardJson as AdaptiveCard
    } catch (err) {
      console.error('Failed to extract text:', err)
      return 'Sorry, I could not extract text from the PDF. Please ensure the file is valid.'
    }
  }
}