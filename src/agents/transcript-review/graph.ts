import { HumanMessage } from '@langchain/core/messages'
import { END, InMemoryStore, MemorySaver, START, StateGraph } from '@langchain/langgraph'

import { log } from '../../internal/logger'
import { ChatModels, getChatModel } from '../utils/utils'
import { BG_SYSTEM_PROMPT, CR_SYSTEM_PROMPT, EDITOR_SYSTEM_PROMPT } from './prompts'
import { TranscriptReviewState, TranscriptReviewStateType } from './state'

const BG_NODE = 'British Expert'
const CR_NODE = 'Content Reviewer'
const EDITOR_NODE = 'Editor'

/**
 * Reviews the given transcript using a British grammar agent and updates the state with feedback.
 *
 * @param state - The current state containing the original transcript to be reviewed.
 * @returns A promise that resolves to the updated state with British grammar feedback included in the `bgFeedback` property.
 */
const britishNode = async (state: TranscriptReviewStateType): Promise<TranscriptReviewStateType> => {
  const { originalTranscript } = state
  const llm = getChatModel(ChatModels.GENERAL)
  const response = await llm.invoke([
    { role: 'system', content: BG_SYSTEM_PROMPT },
    new HumanMessage('Here is the transcript:\n' + originalTranscript),
  ])
  log.debug(`Response from british grammar agent: ${JSON.stringify(response, null, 2)}`)
  return {
    ...state,
    bgFeedback: response.content?.toString?.() ?? '',
  }
}

/**
 * Reviews the given transcript using a Content Reviewer agent and updates the state with feedback.
 *
 * @param state - The current state containing the original transcript to be reviewed.
 * @returns A promise that resolves to the updated state with Content Reviewer feedback included in the `hrFeedback` property.
 */
const contentReviewNode = async (state: TranscriptReviewStateType): Promise<TranscriptReviewStateType> => {
  const { originalTranscript } = state
  const llm = getChatModel(ChatModels.GENERAL)
  const response = await llm.invoke([
    { role: 'system', content: CR_SYSTEM_PROMPT },
    new HumanMessage('Here is the transcript:\n' + originalTranscript),
  ])
  log.debug(`Response from human review agent: ${JSON.stringify(response, null, 2)}`)
  return {
    ...state,
    crFeedback: response.content?.toString?.() ?? '',
  }
}

/**
 * Processes the final transcript by combining feedback from both British grammar and Content Reviewer agents.
 * It invokes an editor agent to rewrite the transcript based on the feedback provided.
 *
 * @param state - The current state containing the original transcript and feedback from both agents.
 * @returns A promise that resolves to the updated state with the final transcript included in the `finalTranscript` property.
 */
const editorNode = async (state: TranscriptReviewStateType): Promise<TranscriptReviewStateType> => {
  const { originalTranscript, bgFeedback, crFeedback } = state
  log.info(`Editing transcript with feedback: BG: ${bgFeedback.length} CR: ${crFeedback.length}`)
  const llm = getChatModel(ChatModels.THINKING)
  const response = await llm.invoke([
    { role: 'system', content: EDITOR_SYSTEM_PROMPT },
    new HumanMessage('Here is the original transcript:\n' + originalTranscript),
    new HumanMessage('Feedback notes from a British Grammar & Localisation Expert:\n' + bgFeedback),
    new HumanMessage('Feedback notes from a Content Reviewer:\n' + crFeedback),
  ])
  log.debug(`Response from editor agent: ${JSON.stringify(response, null, 2)}`)
  return {
    ...state,
    finalTranscript: response.content?.toString?.() ?? '',
  }
}

// Define the state graph for the transcript review process
const workflow = new StateGraph(TranscriptReviewState)
  .addNode(BG_NODE, britishNode)
  .addNode(CR_NODE, contentReviewNode)
  .addNode(EDITOR_NODE, editorNode)
  .addEdge(START, BG_NODE)
  .addEdge(START, CR_NODE)
  .addEdge(BG_NODE, EDITOR_NODE)
  .addEdge(CR_NODE, EDITOR_NODE)
  .addEdge(EDITOR_NODE, END)

// Export the compiled graph for use in the application
export const graph = workflow
  .compile({ checkpointer: new MemorySaver(), store: new InMemoryStore() })
  .withConfig({ runName: 'TranscriptReviewAgent' })
