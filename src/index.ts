import { TurnContext, ActivityTypes } from 'botbuilder'
import express from 'express'
import { GenericCommandHandler } from './commands/genericCommandHandler'
import { adapter } from './internal/initialize'
import { ApplicationTurnState, MessageHandler } from './internal/conversationHandlers'
import { app } from './teamsBot'
import { ATTACHMENT_CONTENT_TYPE, FILE_TIGGER_PATTERN, UploadFileCommandHandler } from './handlers/uploadFileHandler'
import { TranscriptToAudioHandler } from './handlers/transcriptToAudioHandler'
import { FileConsentHandler } from './handlers/fileConsentHandler'
import { TextToTranscriptHandler } from './handlers/textToTranscriptHandler'

import { warningCard } from './internal/cards'

const MATCH_ALL = /.*/g
// This template uses `express` to serve HTTP responses.
// Create express application.
const expressApp = express()
// eslint-disable-next-line import/no-named-as-default-member
expressApp.use(express.json())

expressApp.get('/', function (req, res) {
  res.send('Audry is running.')
})

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${expressApp.name} listening to`, server.address())
})

// Listen for uploaded files
const uploadFileCommandHandler = new UploadFileCommandHandler()
app.message(uploadFileCommandHandler.triggerPatterns, async (context: TurnContext, state: ApplicationTurnState) => {
  await uploadFileCommandHandler.handleInvoked(MessageHandler(context, state))
})

/**
 * Handle Adaptive Card actions.
 */
const textToTranscriptHandler = new TextToTranscriptHandler()
const transcriptToAudioHandler = new TranscriptToAudioHandler()
const fileConsentHandler = new FileConsentHandler()

app.adaptiveCards.actionExecute(MATCH_ALL, async (context: TurnContext, state) => {
  switch (context.activity.value?.action?.verb) {
    case textToTranscriptHandler.triggerVerb:
      return await textToTranscriptHandler.handleActionInvoked(MessageHandler(context, state))
    case transcriptToAudioHandler.triggerVerb:
      return await transcriptToAudioHandler.handleActionInvoked(MessageHandler(context, state))
    default:
      console.warn(`Unhandled action: ${context.activity.value?.verb}`)
      return warningCard(`Unhandled action: ${context.activity.value?.action?.verb}`)
  }
})

// File consent invoke handler
const FILE_CONSENT_INVOKE_NAME = 'fileConsent/invoke'

app.message(
  async (context: TurnContext) => {
    if (ActivityTypes.Invoke == context.activity?.type && context.activity?.name == FILE_CONSENT_INVOKE_NAME) {
      console.log(`File consent invoke received: ${JSON.stringify(context.activity.value)}`)
      return true
    }
    return false
  },
  async (context: TurnContext, state: ApplicationTurnState) => {
    await fileConsentHandler.handleFileConsentInvoke(MessageHandler(context, state))
  }
)

const genericCommandHandler = new GenericCommandHandler()
app.message(genericCommandHandler.triggerPatterns, async (context: TurnContext, state: ApplicationTurnState) => {
  const reply = await genericCommandHandler.handleCommandReceived(context, state)

  if (reply) {
    await context.sendActivity(reply)
  }
})

/**
 * Handle attachments in the incoming activity.
 * @param context - The bot context containing the activity.
 * @returns Updated context if an attachment is found, otherwise the original context.
 */
const handleAttachments = (context: TurnContext) => {
  if (context.activity.attachments && context.activity.attachments.length > 0) {
    const attachment = context.activity.attachments[0]
    if (attachment.contentType === ATTACHMENT_CONTENT_TYPE) {
      // Handle file download info attachment
      console.log(`File Download Info: ${attachment.content.downloadUrl}`)
      context.activity.text = FILE_TIGGER_PATTERN
    }
  }
  return context
}

// Register an API endpoint with `express`. Teams sends messages to your application
// through this endpoint.
//
// The Microsoft 365 Agents Toolkit bot registration configures the bot with `/api/messages` as the
// Bot Framework endpoint. If you customize this route, update the Bot registration
// in `infra/botRegistration/azurebot.bicep`.
expressApp.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await app.run(handleAttachments(context))
  })
})
