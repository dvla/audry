import { TurnState } from '@microsoft/teams-ai'
import { Activity, CardFactory, ConversationReference, MessageFactory, ResourceResponse, TurnContext } from 'botbuilder'

/**
 * ConversationState holds the state of the conversation,
 * including document paths and other metadata.
 */
export interface ConversationState {
  count: number
  documentId: string // Unique identifier for a document
  documentPath: string // Path to the document
  audioFilePath: string // Path to the generated audio file
  userId: string // Unique identifier for the user
}

/**
 * ActivityLike represents an activity that can be sent or received.
 */
type ActivityLike = string | Partial<Activity>

/**
 * ActivityContext provides methods to interact with the conversation
 * and send activities or adaptive cards.
 */
export interface ActivityContext {
  /**
   * send an activity to the conversation
   * @param activity activity to send
   */
  send: (activity: ActivityLike) => Promise<ResourceResponse>
  /**
   * send an adaptive card to the conversation
   * @param card adaptive card to send
   */
  sendCard: (card: any) => Promise<ResourceResponse>
  /**
   * Send an adaptive card proactively to the conversation
   * @param card adaptive card to send
   */
  proactiveSendCard: (card: any) => Promise<void>
  /**
   * Send a message proactively to the conversation
   * @param activity activity to send
   */
  proactiveSend: (activity: ActivityLike) => Promise<void>

  /**
   * the conversation state
   */
  conversation: ConversationState
  /**
   * the inbound activity
   */
  activity: Activity
  /**
   * the inbound activity conversation reference
   */
  ref: Partial<ConversationReference>
}

export type ApplicationTurnState = TurnState<ConversationState>

/**
 * MessageHandler provides methods to handle incoming messages
 * and send responses or adaptive cards.
 * It makes functions available to the underlying handlers.
 * @param context the turn context
 * @param state the application state
 * @returns an ActivityContext for sending messages and cards
 */
export const MessageHandler = (context: TurnContext, state: ApplicationTurnState): ActivityContext => {
  const adapter = context.adapter
  const conversation = state.conversation
  const botIdentity = context.turnState.get(adapter.BotIdentityKey)
  const conversationReference = TurnContext.getConversationReference(context.activity)

  return {
    send: (activity) => context.sendActivity(activity),
    sendCard: (card: any) => context.sendActivity(MessageFactory.attachment(CardFactory.adaptiveCard(card))),
    proactiveSendCard: (card: any) =>
      adapter.continueConversationAsync(botIdentity, conversationReference, async (proactiveContext) => {
        await proactiveContext.sendActivity(MessageFactory.attachment(CardFactory.adaptiveCard(card)))
      }),
    proactiveSend: (message) =>
      adapter.continueConversationAsync(botIdentity, conversationReference, async (proactiveContext) => {
        await proactiveContext.sendActivity(message)
      }),
    conversation: conversation,
    activity: context.activity,

    ref: conversationReference,
  }
}
