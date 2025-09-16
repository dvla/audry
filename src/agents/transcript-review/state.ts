import { Annotation } from '@langchain/langgraph'

/**
 * TranscriptReviewState defines the state structure for the transcript review process.
 * It includes fields for the original transcript, background feedback, content review feedback,
 * and the final reviewed transcript.
 */
export const TranscriptReviewState = Annotation.Root({
  originalTranscript: Annotation<string>({
    reducer: (x, y) => y,
  }),
  bgFeedback: Annotation<string>({
    reducer: (x, y) => y,
  }),
  crFeedback: Annotation<string>({
    reducer: (x, y) => y,
  }),
  edaFeedback: Annotation<string>({
    reducer: (x, y) => y,
  }),
  finalTranscript: Annotation<string>({
    reducer: (x, y) => y,
  }),
})

export type TranscriptReviewStateType = typeof TranscriptReviewState.State
