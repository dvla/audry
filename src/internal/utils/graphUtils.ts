import { graph as showNotesGraph } from '../../agents/show-notes/graph'
import { ShowNotes } from '../../agents/show-notes/state'
import { graph as reviewer } from '../../agents/transcript-review/graph'
import { TranscriptReviewStateType } from '../../agents/transcript-review/state'

/**
 * Generates show notes for a podcast episode.
 * @param transcript - The transcript of the podcast episode.
 * @param podcastId - The unique ID of the podcast episode.
 * @returns The metadata for the generated show notes.
 */
export const generateShowNotes = async (transcript: string, podcastId: string): Promise<ShowNotes> => {
  const response = await showNotesGraph.invoke(
    { transcript },
    {
      configurable: { thread_id: podcastId },
    }
  )
  return response ? response.showNotes : undefined
}

/**
 * Reviews a podcast transcript and provides feedback.
 * @param transcript - The transcript of the podcast episode.
 * @param podcastId - The unique ID of the podcast episode.
 * @returns The transcript review.
 */
export const reviewTranscript = async (transcript: string, podcastId: string): Promise<TranscriptReviewStateType> => {
  const response = await reviewer.invoke(
    { originalTranscript: transcript },
    {
      configurable: { thread_id: podcastId },
    }
  )
  return response ? response : undefined
}
