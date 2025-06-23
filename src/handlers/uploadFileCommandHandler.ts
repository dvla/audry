import { AdaptiveCard, Selector } from '@microsoft/teams-ai'
import { Attachment, ActivityTypes } from 'botbuilder'
import { ActivityContext } from '../internal/conversationHandlers'
import * as ACData from 'adaptivecards-templating'
import responseCard from '../adaptiveCards/extractTextActionResponse.json'
import path from 'path'
import { v7 as uuidv7 } from 'uuid'
import { extractTextFromPdf, writeContentToFile } from '../internal/utils/fileUtils'
import { Config } from '../internal/config'
import { writeExtractedText } from '../internal/utils/documentUtils'
import { warningCard } from '../internal/cards'

// Content type for Teams file download info attachments
export const ATTACHMENT_CONTENT_TYPE = 'application/vnd.microsoft.teams.file.download.info'
// Trigger pattern for file upload command
export const FILE_TIGGER_PATTERN = 'uploadFile'
// Only allow PDF files to be processed
const ATTACHMENT_FILE_TYPE = 'pdf'

/**
 * The `UploadFileCommandHandler` responds
 * with an Adaptive Card when a user uploads a file
 */
export class UploadFileCommandHandler {
  triggerPatterns: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TIGGER_PATTERN

  /**
   * Handles the command when a user uploads a file.
   * It checks if the uploaded file is a PDF, downloads it,
   * and responds with an Adaptive Card confirming the upload.
   * @param context application context
   * @param state application state
   * @returns adaptive card or a message indicating only PDF files are accepted
   */
  async handleInvoked({
    proactiveSendCard,
    sendCard,
    send,
    ref,
    conversation,
    activity,
  }: ActivityContext): Promise<void> {
    console.log(`File Uploading: ${activity.text}`)

    // Check if the activity has attachments and if the first attachment is a pdf
    const attachment = activity.attachments && activity.attachments[0]
    if (!attachment || attachment.content.fileType !== ATTACHMENT_FILE_TYPE) {
      await sendCard(warningCard('Sorry! I can only handle PDF files. Please upload a valid PDF file.'))
      return
    }

    // Get the unique ID from the attachment content
    const id = activity.attachments[0].content.uniqueId

    // Download the file and save it to the temp folder
    const fileDownloadPath = await this.handleFileDownload(attachment)
    conversation.documentPath = fileDownloadPath
    // Generate and set a new UUID for documentId in state
    conversation.documentId = uuidv7()

    await send({ type: ActivityTypes.Typing })

    try {
      const { extractedText, pages } = await extractTextFromPdf(fileDownloadPath, Number(Config.MAX_PAGES))
      await writeExtractedText(extractedText, conversation.documentId)

      const cardJson = new ACData.Template(responseCard).expand({
        $root: {
          title: 'Text Extracted',
          body: `Extracted text from ${pages} page(s). - textToTranscript`,
        },
      })
      await proactiveSendCard(cardJson)
    } catch (err) {
      console.error('Failed to extract text:', err)
      await proactiveSendCard(
        warningCard('Sorry, I could not extract text from the PDF. Please ensure the file is valid.')
      )
    }
  }

  /**
   * Handles file download and saves the file.
   * @param {object} file - The file attachment.
   * @param {object} context - The bot context.
   */
  async handleFileDownload(file: Attachment) {
    const filePath = path.join(Config.FILES_DIR, file.name)
    console.log(`Downloading file to: ${filePath}`)
    await writeContentToFile(file.content.downloadUrl, filePath)
    console.log(`File downloaded successfully: ${filePath}`)
    return filePath
  }
}
