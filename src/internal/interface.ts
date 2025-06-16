import { TurnState } from '@microsoft/teams-ai'

export interface ConversationState {
  count: number
  documentId: string // Unique identifier for a document
  documentPath: string // Path to the document
  extractedTextPath: string // Path to the extracted text file
  transcriptTextPath: string // Path to the transcript text file
}
export type ApplicationTurnState = TurnState<ConversationState>
