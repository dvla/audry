import { TurnState } from '@microsoft/teams-ai'

export interface ConversationState {
  count: number
  documentId: string // Unique identifier for a document
  documentPath: string // Path to the document
}
export type ApplicationTurnState = TurnState<ConversationState>
