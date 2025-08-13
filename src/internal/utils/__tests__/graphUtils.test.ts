import { beforeEach, describe, expect, it, vi } from 'vitest'

import { generateShowNotes, reviewTranscript } from '../graphUtils'

const { mockShowNotesGraph, mockReviewerGraph } = vi.hoisted(() => ({
  mockShowNotesGraph: { invoke: vi.fn() },
  mockReviewerGraph: { invoke: vi.fn() },
}))

// Mock the graph modules (hoisted) so the aliased imports inside graphUtils resolve to these mocks
vi.mock('../../../agents/show-notes/graph', () => ({ graph: mockShowNotesGraph }))
vi.mock('../../../agents/transcript-review/graph', () => ({ graph: mockReviewerGraph }))

describe('graphUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateShowNotes', () => {
    it('returns showNotes from the graph response', async () => {
      const fakeShowNotes = { title: 'Test', shortSummary: 'Summary', numOfWords: '42' }
      mockShowNotesGraph.invoke.mockResolvedValueOnce({ showNotes: fakeShowNotes })
      const result = await generateShowNotes('transcript', 'podcast-1')
      expect(mockShowNotesGraph.invoke).toHaveBeenCalledWith(
        { transcript: 'transcript' },
        { configurable: { thread_id: 'podcast-1' } }
      )
      expect(result).toEqual(fakeShowNotes)
    })

    it('returns undefined if response is falsy', async () => {
      mockShowNotesGraph.invoke.mockResolvedValueOnce(undefined)
      const result = await generateShowNotes('t', 'id')
      expect(result).toBeUndefined()
    })
  })

  describe('reviewTranscript', () => {
    it('returns the graph response', async () => {
      const fakeReview = { originalTranscript: 't', bgFeedback: 'b', hrFeedback: 'h', finalTranscript: 'f' }
      mockReviewerGraph.invoke.mockResolvedValueOnce(fakeReview)
      const result = await reviewTranscript('trans', 'podcast-2')
      expect(mockReviewerGraph.invoke).toHaveBeenCalledWith(
        { originalTranscript: 'trans' },
        { configurable: { thread_id: 'podcast-2' } }
      )
      expect(result).toEqual(fakeReview)
    })

    it('returns undefined if response is falsy', async () => {
      mockReviewerGraph.invoke.mockResolvedValueOnce(undefined)
      const result = await reviewTranscript('t', 'id')
      expect(result).toBeUndefined()
    })
  })
})
