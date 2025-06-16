import { Selector } from '@microsoft/teams-ai'
import { Activity, TurnContext, CardFactory, MessageFactory, Attachment } from 'botbuilder'
import { ApplicationTurnState } from '../internal/interface'
import * as ACData from 'adaptivecards-templating'
import responseCard from '../adaptiveCards/uploadFileActionResponse.json'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { v7 as uuidv7 } from 'uuid'
import { pipeline } from 'stream/promises'

// Content type for Teams file download info attachments
export const ATTACHMENT_CONTENT_TYPE = 'application/vnd.microsoft.teams.file.download.info'
// Trigger pattern for file upload command
export const FILE_TIGGER_PATTERN = 'uploadFile'
// Only allow PDF files to be processed
const ATTACHMENT_FILE_TYPE = 'pdf'
// Directory to temporarily store uploaded files
const FILES_DIR = os.tmpdir()

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
  async handleCommandReceived(
    context: TurnContext,
    state: ApplicationTurnState
  ): Promise<string | Partial<Activity> | void> {
    console.log(`File Uploading: ${context.activity.text}`)

    // Check if the activity has attachments and if the first attachment is a pdf
    const attachment = context.activity.attachments && context.activity.attachments[0]
    if (!attachment || attachment.content.fileType !== ATTACHMENT_FILE_TYPE) {
      return 'Sorry! I can only handle PDF files. Please upload a valid PDF file.'
    }

    // Get the unique ID from the attachment content
    const id = context.activity.attachments[0].content.uniqueId

    // Download the file and save it to the temp folder
    await this.handleFileDownload(attachment, context, state)

    // Generate and set a new UUID for documentId in state
    state.conversation.documentId = uuidv7()

    // Create an adaptive card
    const cardJson = new ACData.Template(responseCard).expand({
      $root: {
        title: 'File Uploaded!',
        body: `File ${id} has been uploaded successfully. Document ID: ${state.conversation.documentId}`,
      },
    })
    return MessageFactory.attachment(CardFactory.adaptiveCard(cardJson))
  }

  /**
   * Handles file download and saves the file.
   * @param {object} file - The file attachment.
   * @param {object} context - The bot context.
   */
  async handleFileDownload(file: Attachment, context: TurnContext, state: ApplicationTurnState) {
    const filePath = path.join(FILES_DIR, file.name)
    state.conversation.documentPath = filePath
    console.log(`Downloading file to: ${filePath}`)
    await this.writeFile(file.content.downloadUrl, filePath)

    console.log(`File downloaded successfully: ${filePath}`)
  }

  /**
   * Downloads the file from the given URL and saves it to the specified path using fetch and stream.pipeline.
   * @param {string} contentUrl - The URL of the file to download.
   * @param {string} filePath - The path where the file will be saved.
   * @returns {Promise<void>}
   */
  async writeFile(contentUrl, filePath) {
    try {
      const res = await fetch(contentUrl)
      if (!res.body || !res.ok) throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`)
      const fileStream = fs.createWriteStream(filePath)
      await pipeline(res.body, fileStream)
    } catch (error) {
      console.error('Error downloading the file:', error.message)
      throw new Error('Failed to download file')
    }
  }
}
