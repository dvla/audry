import fs from 'fs/promises'

import { createFileInfoAttachment, warningCard } from '../internal/cards'
import { ActivityContext } from '../internal/conversationHandlers'
import { log } from '../internal/logger'

const FILE_UPLOAD_ACTION = 'fileUpload'
export class FileConsentHandler {
  /**
   * Main handler for file consent invoke activities
   * @param context - The turn context
   * @param state - The application turn state
   */
  async handleFileConsentInvoke({ send, sendCard, activity, proactiveSendCard }: ActivityContext): Promise<void> {
    try {
      const fileConsentValue = activity?.value
      const action = fileConsentValue?.action // "accept" or "decline"
      const type = fileConsentValue?.type // "fileUpload"

      log.debug(`File consent - action: ${action}, type: ${type}`)

      if (type === FILE_UPLOAD_ACTION && action === 'accept') {
        // Handle file consent accept
        await this.handleFileConsentAccept(activity, send, sendCard)
      } else {
        // Handle file consent decline
        log.warn('File consent declined')
        await this.handleFileConsentDecline(sendCard)
      }

      // Send invokeResponse to avoid "Something went wrong"
      await send({
        type: 'invokeResponse',
        value: { status: 200 },
      })
    } catch (error) {
      log.error('[FileConsentInvoke] Error handling file consent invoke:', error)
      await proactiveSendCard(warningCard('Failed to handle file consent invoke.'))
    }
  }

  /**
   * Handles file consent accept activity with proper SharePoint upload session handling
   * @param context - The activity context
   */
  async handleFileConsentAccept(activity, send, sendCard): Promise<void> {
    try {
      log.debug('[FileConsentAccept] Received file consent accept activity.')

      const consentContext = activity.value
      const uploadUrl = consentContext.uploadInfo?.uploadUrl
      const uniqueId = consentContext.uploadInfo?.uniqueId
      const fileName = consentContext.uploadInfo?.name
      const contentUrl = consentContext.uploadInfo?.contentUrl

      if (!uploadUrl) {
        log.error('[FileConsentAccept] Upload URL not provided in consent response.')
        throw new Error('Upload URL not provided in consent response')
      }

      log.debug('[FileConsentAccept] Uploading file to Teams...')

      try {
        // Get the transcript file path for the current conversation
        const audioFile = consentContext.context.fileId
        let audio: Buffer
        let fileSize: number // file size in bytes

        if (audioFile) {
          audio = await fs.readFile(audioFile)
          const stats = await fs.stat(audioFile)
          fileSize = stats.size // file size in bytes
        }

        const uploadResponse = await this.uploadFileToTeams(uploadUrl, audio, fileSize)

        if (uploadResponse.success) {
          log.info(`[FileConsentAccept] Upload successful`)
          // Create file info attachment using the contentUrl from the consent response
          const fileInfoAttachment = createFileInfoAttachment(fileName, contentUrl, uniqueId)

          log.debug('[FileConsentAccept] Sending file info attachment to Teams...')
          await send({
            type: 'message',
            attachments: [fileInfoAttachment],
          })
        } else {
          throw new Error(`Upload failed: ${uploadResponse.error}`)
        }
      } catch (uploadError) {
        log.error(`[FileConsentAccept] Upload failed:`, uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`, { cause: uploadError })
      }
    } catch (error) {
      log.error('[FileConsentAccept] Error handling file consent accept:', error)
      await sendCard(warningCard('Failed to upload audio file to Teams. Please try again.'))
    }
  }

  /**
   * Upload file to Teams using proper SharePoint upload session handling
   * @param uploadUrl - The upload session URL
   * @param fileBuffer - The file data as buffer
   * @param fileSize - The file size
   * @returns Promise with upload result
   */
  private async uploadFileToTeams(
    uploadUrl: string,
    fileBuffer: Buffer,
    fileSize: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const chunkSize = 327680 // 320KB chunks (recommended by Microsoft)

      if (fileSize <= chunkSize) {
        // Single chunk upload
        log.debug('[FileUpload] Uploading single chunk...')

        const response = await this.uploadFile(uploadUrl, fileBuffer, fileSize, `bytes 0-${fileSize - 1}/${fileSize}`)

        if (response.status >= 200 && response.status < 300) {
          return { success: true }
        } else {
          return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
        }
      } else {
        // Multi-chunk upload
        log.debug('[FileUpload] Uploading multiple chunks...')
        let uploadedBytes = 0

        while (uploadedBytes < fileSize) {
          const remainingBytes = fileSize - uploadedBytes
          const currentChunkSize = Math.min(chunkSize, remainingBytes)
          const chunk = fileBuffer.subarray(uploadedBytes, uploadedBytes + currentChunkSize)

          const rangeStart = uploadedBytes
          const rangeEnd = uploadedBytes + currentChunkSize - 1

          log.debug(`[FileUpload] Uploading chunk: bytes ${rangeStart}-${rangeEnd}/${fileSize}`)

          const response = await this.uploadFile(
            uploadUrl,
            chunk,
            currentChunkSize,
            `bytes ${rangeStart}-${rangeEnd}/${fileSize}`
          )

          if (!(response.status >= 200 && response.status < 300)) {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
          }

          uploadedBytes += currentChunkSize
        }

        return { success: true }
      }
    } catch (error) {
      log.error('[FileUpload] Upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      }
    }
  }

  /**
   * Handles file consent decline activity
   * @param sendCard - Function to send card message
   */
  async handleFileConsentDecline(sendCard): Promise<void> {
    await sendCard(warningCard('File upload was declined. The audio file will not be shared.'))
    log.debug('User declined file upload consent')
  }

  /**
   * Uploads a file to a specified URL in chunks.
   * @param uploadUrl - The URL to upload the file to.
   * @param buffer - The file buffer to upload.
   * @param size - The size of the file.
   * @param bytes - The byte range to upload.
   * @returns The response from the upload request.
   */
  async uploadFile(uploadUrl: string, buffer: Buffer, size: number, bytes: string) {
    return await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Range': bytes,
        'Content-Length': size.toString(),
      },
      body: new Uint8Array(buffer),
    })
  }
}
