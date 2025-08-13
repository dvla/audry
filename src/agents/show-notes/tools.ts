import { tool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Counts the number of words in a given text.
 * @param text The text to count words in.
 * @returns The number of words in the text.
 */
export const countWords = (text: string): number => {
  return String(text).trim().split(/\s+/).filter(Boolean).length
}

const countingToolSchema = z.object({
  text: z.string().describe('The text to count words in'),
})
export type countingToolInput = z.infer<typeof countingToolSchema>

const countingTool = tool((input: countingToolInput): number => countWords(input.text), {
  name: 'countWords',
  description: 'Provides an accurate word count of the text',
  schema: countingToolSchema,
})
export const shownotesTools = [countingTool]
