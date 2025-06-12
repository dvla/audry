import { TurnContext } from 'botbuilder'
import express from 'express'
import { GenericCommandHandler } from './commands/genericCommandHandler'
import { adapter } from './internal/initialize'
import { ApplicationTurnState } from './internal/interface'
import { app } from './teamsBot'
import {
  ATTACHMENT_CONTENT_TYPE,
  FILE_TIGGER_PATTERN,
  UploadFileCommandHandler,
} from './commands/uploadFileCommandHandler'
import { ExtractTextActionHandler } from './cardActions/extractTextActionHandler'

// This template uses `express` to serve HTTP responses.
// Create express application.
const expressApp = express()
// eslint-disable-next-line import/no-named-as-default-member
expressApp.use(express.json())

const server = expressApp.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\nBot Started, ${expressApp.name} listening to`, server.address())
})

// Listen for uploaded files
const uploadFileCommandHandler = new UploadFileCommandHandler()
app.message(uploadFileCommandHandler.triggerPatterns, async (context: TurnContext, state: ApplicationTurnState) => {
  const reply = await uploadFileCommandHandler.handleCommandReceived(context, state)
  if (reply) {
    await context.sendActivity(reply)
  }
})

// Listen for action invoked on Adaptive Card with verb 'extractText'
const extractTextActionHandler = new ExtractTextActionHandler()
app.adaptiveCards.actionExecute(extractTextActionHandler.triggerVerb, async (context: TurnContext, state, data) => {
  return await extractTextActionHandler.handleActionInkvoked(context, state, data)
})

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
