import { Activity } from 'botbuilder'

import { textToTranscriptCard } from '../internal/cards'
import { ActivityContext } from '../internal/conversationHandlers'
import { log } from '../internal/logger'
import {
  EDITED_TRANSCRIPT_TEXT,
  TRANSCRIPT_TEXT,
  getTranscripts,
  readFile,
  writeFile,
} from '../internal/utils/documentUtils'

const TRANSCRIPT_START = 'Speaker 1'

export class DialogHandler {
  /**
   * Handler for creating the dialog card with the current transcript content
   * @param send - the function to send a response
   * @param conversation - the conversation context containing documentId
   */
  async handleDialogInvoke({ send, conversation, activity }: ActivityContext): Promise<void> {
    log.debug(`Dialog invoke received for document: ${conversation.documentId}`)
    await send(await this.dialogResponse(conversation.userId, conversation.documentId, activity.value?.data.index))
  }

  /**
   * Handler for save/cancel/toggle actions on transcript from the dialog
   * @param send - the function to send a response
   * @param activity - the activity containing the action data
   * @param conversation - the conversation context containing documentId
   */
  async handleDialogSubmit({ send, activity, conversation, updateCard }: ActivityContext): Promise<void> {
    const action = activity.value?.data.action
    const transcriptNumber = activity.value?.data.index

    log.debug(`Edit action received: ${JSON.stringify(action)}`)

    switch (action) {
      case 'toggleEdit':
        await writeFile(
          conversation.userId,
          conversation.documentId,
          transcriptNumber === 0 ? TRANSCRIPT_TEXT : EDITED_TRANSCRIPT_TEXT,
          this.updateTranscript(activity)
        )
        await send(await this.dialogResponse(conversation.userId, conversation.documentId, transcriptNumber))
        await updateCard(await textToTranscriptCard('Transcript Updated', await getTranscripts(conversation)))
        break
      case 'saveTranscript':
        await writeFile(
          conversation.userId,
          conversation.documentId,
          transcriptNumber === 0 ? TRANSCRIPT_TEXT : EDITED_TRANSCRIPT_TEXT,
          this.updateTranscript(activity)
        )
        await send(this.cancelResponse())
        await updateCard(await textToTranscriptCard('Transcript Updated', await getTranscripts(conversation)))
        break
      default:
        await send(this.cancelResponse())
        break
    }
  }

  /**
   * Generate transcript blocks using an adaptive card with edit functionality to show different speakers
   */
  generateTranscriptBlocks = (transcriptTurns: any[], transcriptNumber: number): any[] => {
    return transcriptTurns
      .map((turn, index) => {
        const isHost = turn.speaker === 'Speaker 1'
        return [
          {
            type: 'TextBlock',
            text: `${turn.speaker}`,
            weight: 'Lighter',
            size: 'Small',
            isSubtle: true,
          },
          {
            type: 'Container',
            style: isHost ? 'emphasis' : 'accent',
            spacing: 'Small',
            items: [
              {
                type: 'ColumnSet',
                columns: [
                  {
                    type: 'Column',
                    width: 'stretch',
                    items: [
                      {
                        type: 'TextBlock',
                        id: `text_${index}`,
                        text: turn.text,
                        wrap: true,
                      },
                      {
                        type: 'Input.Text',
                        id: `edit_${index}`,
                        value: turn.text,
                        isMultiline: true,
                        isVisible: false,
                      },
                    ],
                  },
                  {
                    type: 'Column',
                    width: 'auto',
                    items: [
                      {
                        type: 'ActionSet',
                        id: `edit_action_${index}`,
                        actions: [
                          {
                            type: 'Action.ToggleVisibility',
                            title: 'Edit',
                            isVisible: true,
                            tooltip: 'Edit this turn',
                            id: `edit_btn_${index}`,
                            targetElements: [
                              `text_${index}`,
                              `edit_${index}`,
                              `edit_action_${index}`,
                              `done_action_${index}`,
                            ],
                          },
                        ],
                      },
                      {
                        type: 'ActionSet',
                        id: `done_action_${index}`,
                        isVisible: false,
                        actions: [
                          {
                            type: 'Action.Submit',
                            title: 'Save',
                            tooltip: 'Done editing',
                            id: `done_btn_${index}`,
                            style: 'positive',
                            data: {
                              action: 'toggleEdit',
                              id: index,
                              index: transcriptNumber,
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]
      })
      .flat()
  }

  /**
   * Splits the transcript into turns, in the format of speaker and text
   * @param transcript - The transcript text to process.
   * @returns An array of transcript turns.
   */
  getTranscriptTurns = (transcript: string[]): any[] => {
    return transcript
      .filter((line) => line.trim() !== '')
      .map((line, index) => {
        const isHost = index % 2 === 0
        return {
          speaker: isHost ? 'Speaker 1' : 'Speaker 2',
          text: line.replace(/^(Speaker\s+[12]:?\s*)/i, '').trim(), // Remove speaker label
        }
      })
  }

  /**
   * Create the dialog card with the current transcript content
   * @param documentId - The unique identifier for the document
   * @returns The adaptive card for the dialog
   */
  dialogCard = async (userId: string, documentId: string, index: number) => {
    const transcript = await readFile(userId, documentId, index === 0 ? TRANSCRIPT_TEXT : EDITED_TRANSCRIPT_TEXT)
    const sanitizedTranscript = transcript.substring(transcript.indexOf(TRANSCRIPT_START)).replace(/$/u, '')
    const transcriptSplit = sanitizedTranscript.split('\n').filter((line) => line.trim() !== '') || []
    const transcriptTurns = this.getTranscriptTurns(transcriptSplit)
    const transcriptBlocks = this.generateTranscriptBlocks(transcriptTurns, index)

    return {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.6',
        msteams: {
          width: 'Full',
        },
        body: [
          {
            type: 'TextBlock',
            text: '🎙️ Podcast Transcript',
            size: 'Large',
            weight: 'Bolder',
            horizontalAlignment: 'Center',
            spacing: 'Medium',
          },
          {
            type: 'Container',
            id: 'transcriptContainer',
            items: transcriptBlocks,
          },
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: 'Save Changes',
            data: {
              action: 'saveTranscript',
              index: index,
            },
            style: 'positive',
          },
          {
            type: 'Action.Submit',
            title: 'Cancel',
            data: {
              action: 'cancel',
            },
          },
        ],
      },
    }
  }

  /**
   * Create the dialog response for the current transcript content
   * @param documentId - The unique identifier for the document
   * @returns The dialog response object
   */
  dialogResponse = async (userId: string, documentId: string, index: number = 0) => {
    return {
      type: 'invokeResponse',
      value: {
        status: 200,
        body: {
          task: {
            type: 'continue',
            value: {
              title: `Podcast Transcript`,
              height: 'large',
              width: 'large',
              card: await this.dialogCard(userId, documentId, index), // Use the method to create the card
            },
          },
        },
      },
    }
  }

  /**
   * Create the cancel response for dialog actions
   * @returns The cancel response for dialog actions, indicating no changes were made
   */
  cancelResponse = () => {
    return {
      type: 'invokeResponse',
      value: {
        status: 200,
      },
    }
  }

  /**
   * Update the transcript based on the edited values from the dialog
   * @param activity - The activity containing the edited values
   * @returns The updated transcript as a string
   */
  updateTranscript = (activity: Activity) => {
    const editedLines = {}

    // Extract current input values
    Object.keys(activity.value?.data || {}).forEach((key) => {
      if (key.startsWith('edit_')) {
        const index = parseInt(key.replace('edit_', ''))
        editedLines[index] = activity.value.data[key]
      }
    })

    // Build transcript array with edits in correct order
    const transcript = Object.keys(editedLines).map((key) => {
      const speaker = +key % 2 === 0 ? 'Speaker 1: ' : 'Speaker 2: '
      return speaker + (editedLines[key] || '')
    })

    return transcript.join('\n\n')
  }
}
