import { Annotation } from '@langchain/langgraph'
import { z } from 'zod'

export const ShowNotesSchema = z.object({
  title: z.string().min(2).max(100).describe('Title of the show'),
  shortSummary: z.string().min(10).max(100).describe('Short summary of the show'),
  numOfWords: z.string().describe('Number of words in the show transcript'),
})

/**
 * Type inferred from ShowNotesSchema for type safety.
 */
export type ShowNotes = z.infer<typeof ShowNotesSchema>

export const ShowNotesState = Annotation.Root({
  transcript: Annotation<string>(),
  wordCount: Annotation<number>(),
  showNotes: Annotation<ShowNotes>(),
})

export type ShowNotesStateType = typeof ShowNotesState.State
