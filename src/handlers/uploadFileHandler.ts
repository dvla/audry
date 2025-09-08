import { Selector } from '@microsoft/teams-ai'
import { Activity, ActivityTypes, Attachment } from 'botbuilder'
import path from 'path'
import { v7 as uuidv7 } from 'uuid'

import { uploadFileCard, warningCard } from '../internal/cards'
import { Config } from '../internal/config'
import { ActivityContext, ConversationState } from '../internal/conversationHandlers'
import { log } from '../internal/logger'
import { extractAndWriteText, writeContentToFile } from '../internal/utils/fileUtils'
import { getUserId } from '../internal/utils/userUtils'
import { DEFAULT_CONFIG, EpisodeSchema } from '../tts/episodeConfig'

// Content type for Teams file download info attachments
export const ATTACHMENT_CONTENT_TYPE = 'application/vnd.microsoft.teams.file.download.info'
// Trigger pattern for file upload command
export const FILE_TIGGER_PATTERN = 'uploadFile'

/**
 * The `UploadFileCommandHandler` responds
 * with an Adaptive Card when a user uploads a file
 */
export class UploadFileCommandHandler {
  triggerPatterns: string | RegExp | Selector | (string | RegExp | Selector)[] = FILE_TIGGER_PATTERN

  /**
   * Sets up a new conversation
   */
  newConversation(activity: Activity, conversation: any, fileDownloadPath: string) {
    conversation.documentPath = fileDownloadPath
    conversation.documentId = uuidv7()
    conversation.userId = getUserId(activity)
    conversation.config = conversation.config || DEFAULT_CONFIG
  }

  /**
   * Handles the command when a user uploads a file.
   * and responds with an Adaptive Card confirming the upload.
   * @param context application context
   * @param state application state
   */
  async handleInvoked({ proactiveSendCard, sendCard, send, conversation, activity }: ActivityContext): Promise<void> {
    await send({ type: ActivityTypes.Typing })

    const attachment = activity.attachments?.[0]
    if (!attachment) {
      await sendCard(warningCard('No file was uploaded. Please upload a valid file.'))
      return
    }

    // Download the file and save it to the temp folder
    const fileDownloadPath = await this.handleFileDownload(attachment)
    this.newConversation(activity, conversation, fileDownloadPath)

    try {
      await extractAndWriteText(fileDownloadPath, conversation.userId, conversation.documentId)
      await proactiveSendCard(await this.createUploadFileCard(conversation))
    } catch (err) {
      log.error('Failed to extract text:', err)
      await proactiveSendCard(
        warningCard(`Sorry, I could not extract text from the uploaded file (${attachment.name}).`)
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
    await writeContentToFile(file.content.downloadUrl, filePath)
    log.info(`File downloaded successfully: ${filePath}`)
    return filePath
  }

  /**
   * Handles saving the episode configuration.
   * @param {ActivityContext} context - The activity context.
   */
  async handleSaveConfig({ conversation, activity, updateCard, proactiveSendCard }: ActivityContext) {
    activity.value.voices = activity.value.voices.split(',')
    const parseResult = EpisodeSchema.safeParse(activity.value)
    if (!parseResult.success) {
      log.error(`Invalid episode config: ${JSON.stringify(parseResult.error)}`)
      await proactiveSendCard(warningCard('Invalid episode configuration. Please check your input.'))
      return
    }
    conversation.config = parseResult.data
    log.debug(`Episode config applied: ${JSON.stringify(activity.value)}`)

    await updateCard(await this.createUploadFileCard(conversation))
  }

  /**
   * Generates the upload file card.
   * @param conversation - The conversation context.
   * @returns The upload file card.
   */
  async createUploadFileCard(conversation: ConversationState) {
    return await uploadFileCard(
      'File Processed',
      `Successfully extracted text from file: ${path.basename(conversation.documentPath)}`,
      conversation.config
    )
  }
}
