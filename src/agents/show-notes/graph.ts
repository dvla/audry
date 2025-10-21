import { HumanMessage } from '@langchain/core/messages'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { END, InMemoryStore, MemorySaver, START, StateGraph } from '@langchain/langgraph'

import { Config } from '../../internal/config'
import { log } from '../../internal/logger'
import { SYSTEM_PROMPT } from './prompts'
import { ShowNotesSchema, ShowNotesState, ShowNotesStateType } from './state'
import { countWords } from './tools'

// Define the LLM
const llm = new ChatGoogleGenerativeAI({ model: Config.GEMINI_MODEL, apiKey: Config.GEMINI_API_KEY })
const structuredllm = llm.withStructuredOutput(ShowNotesSchema, {
  name: 'ShowNotesllm',
})

/**
 * Counts the number of words in a given transcript.
 * @param transcript - The transcript text to count words in.
 * @returns The number of words in the transcript.
 */
const countingNode = async (state: ShowNotesStateType): Promise<ShowNotesStateType> => {
  const { transcript } = state
  return {
    ...state,
    wordCount: countWords(transcript),
  }
}

/**
 * Writes the show notes based on the transcript and word count.
 * @param state - The current state of the show notes workflow.
 * @returns The updated state with the generated show notes.
 */
const writeNotesNode = async (state: ShowNotesStateType): Promise<ShowNotesStateType> => {
  const { wordCount, transcript } = state

  const response = await structuredllm.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    new HumanMessage(`The number of words in the transcript is ${wordCount} \n`),
    new HumanMessage('Here is the transcript:\n' + transcript),
  ])
  log.info(`Response from show-notes agent: ${JSON.stringify(response, null, 2)}`)
  return {
    ...state,
    showNotes: response,
  }
}
const workflow = new StateGraph(ShowNotesState)
  .addNode('countWords', countingNode)
  .addNode('writeNotes', writeNotesNode)
  .addEdge(START, 'countWords')
  .addEdge('countWords', 'writeNotes')
  .addEdge('writeNotes', END)

export const graph = workflow
  .compile({ checkpointer: new MemorySaver(), store: new InMemoryStore() })
  .withConfig({ runName: 'ShowNotesAgent' })
