import { ActivityTypes, TurnContext } from 'botbuilder'
import express from 'express'

import { GenericCommandHandler } from './commands/genericCommandHandler'
import { DialogHandler } from './handlers/dialogHandler'
import { EditTranscriptHandler } from './handlers/editTranscriptHandler'
import { FileConsentHandler } from './handlers/fileConsentHandler'
import { ReviewHandler } from './handlers/reviewHandler'
import { TextToTranscriptHandler } from './handlers/textToTranscriptHandler'
import { TranscriptToAudioHandler } from './handlers/transcriptToAudioHandler'
import { ATTACHMENT_CONTENT_TYPE, FILE_TIGGER_PATTERN, UploadFileCommandHandler } from './handlers/uploadFileHandler'
import { SAVE_CONFIG_MESSAGE, warningCard } from './internal/cards'
import { ApplicationTurnState, MessageHandler } from './internal/conversationHandlers'
import { adapter } from './internal/initialize'
import { log } from './internal/logger'
import { app } from './teamsBot'

const MATCH_ALL = /.*/g

// This template uses `express` to serve HTTP responses.
// Create express application.
const expressApp = express()
// eslint-disable-next-line import/no-named-as-default-member
expressApp.use(express.json())

expressApp.get('/', function (req, res) {
  res.send('Audry is running.')
})

expressApp.get('/health', function (req, res) {
  res.send('OK')
})

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  log.info(`\nBot Started, ${expressApp.name} listening to ${JSON.stringify(server.address())}...`)
})

// Listen for uploaded files
const uploadFileCommandHandler = new UploadFileCommandHandler()
app.message(uploadFileCommandHandler.triggerPatterns, async (context: TurnContext, state: ApplicationTurnState) => {
  await uploadFileCommandHandler.handleInvoked(MessageHandler(context, state))
})

const reviewHandler = new ReviewHandler()
app.message(reviewHandler.triggerPatterns, async (context: TurnContext, state: ApplicationTurnState) => {
  await reviewHandler.handleInvoked(MessageHandler(context, state))
})

const editTranscriptHandler = new EditTranscriptHandler()
app.message(editTranscriptHandler.triggerPatterns, async (context: TurnContext, state: ApplicationTurnState) => {
  await editTranscriptHandler.handleInvoked(MessageHandler(context, state))
})

/**
 * Handle Adaptive Card actions.
 */
const textToTranscriptHandler = new TextToTranscriptHandler()
const transcriptToAudioHandler = new TranscriptToAudioHandler()
const fileConsentHandler = new FileConsentHandler()
const dialogHandler = new DialogHandler()

app.adaptiveCards.actionExecute(MATCH_ALL, async (context: TurnContext, state) => {
  switch (context.activity.value?.action?.verb) {
    case textToTranscriptHandler.triggerVerb:
      return await textToTranscriptHandler.handleActionInvoked(MessageHandler(context, state))
    case transcriptToAudioHandler.triggerVerb:
      return await transcriptToAudioHandler.handleActionInvoked(MessageHandler(context, state))
    case reviewHandler.triggerVerb:
      return await reviewHandler.handleActionInvoked(MessageHandler(context, state))
    default:
      log.warn(`Unhandled action: ${context.activity.value?.verb}`)
      return warningCard(`Unhandled action: ${context.activity.value?.action?.verb}`)
  }
})

// File consent invoke handler
const FILE_CONSENT_INVOKE_NAME = 'fileConsent/invoke'
const TASK_INVOKE_NAME = 'task/fetch'
const TASK_SUBMIT_NAME = 'task/submit'

app.message(
  async (context: TurnContext): Promise<any> => {
    if (ActivityTypes.Invoke == context.activity.type && context.activity.name == FILE_CONSENT_INVOKE_NAME) {
      return true
    }
    return false
  },
  async (context: TurnContext, state: ApplicationTurnState) => {
    if (context.activity.name === FILE_CONSENT_INVOKE_NAME) {
      return await fileConsentHandler.handleFileConsentInvoke(MessageHandler(context, state))
    }
  }
)

app.message(
  async (context: TurnContext) => {
    if (ActivityTypes.Message == context.activity.type && context.activity.value?.action == SAVE_CONFIG_MESSAGE) {
      return true
    }
    return false
  },
  async (context: TurnContext, state: ApplicationTurnState) => {
    if (context.activity.value?.action === SAVE_CONFIG_MESSAGE) {
      await uploadFileCommandHandler.handleSaveConfig(MessageHandler(context, state))
    }
  }
)

app.message(
  async (context: TurnContext): Promise<any> => {
    if (context.activity?.name == TASK_INVOKE_NAME || context.activity?.name == TASK_SUBMIT_NAME) {
      return true
    }
    return false
  },
  async (context: TurnContext, state: ApplicationTurnState) => {
    switch (context.activity.name) {
      case TASK_INVOKE_NAME:
        await dialogHandler.handleDialogInvoke(MessageHandler(context, state))
        break
      case TASK_SUBMIT_NAME:
        await dialogHandler.handleDialogSubmit(MessageHandler(context, state))
        break
      default:
        log.warn(`Unhandled invoke activity: ${context.activity.name}`)
        await context.sendActivity(warningCard(`Unhandled invoke activity: ${context.activity.name}`))
        break
    }
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
      log.debug(`File Download Info: ${attachment.content.downloadUrl}`)
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
