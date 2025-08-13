import { ActivityTypes } from 'botbuilder'
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ReviewHandler } from '../reviewHandler'

const { mockReadFile, mockWriteFile, mockReviewTranscript } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockReviewTranscript: vi.fn(),
}))

vi.mock('../../internal/utils/documentUtils', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  TRANSCRIPT_TEXT: 'transcript.txt',
  EDITED_TRANSCRIPT_TEXT: 'transcript_edited.txt',
  EXTRACTED_TEXT: 'transcript_extracted.txt',
}))

vi.mock('../../internal/utils/graphUtils', () => ({
  reviewTranscript: mockReviewTranscript,
}))

describe('ReviewHandler', () => {
  let handler: ReviewHandler
  let activityContext: any

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new ReviewHandler()
    activityContext = {
      send: vi.fn().mockResolvedValue({}),
      sendCard: vi.fn().mockResolvedValue({}),
      proactiveSend: vi.fn().mockResolvedValue({}),
      proactiveSendCard: vi.fn().mockResolvedValue({}),
      conversation: {
        documentId: 'doc123',
        userId: 'user456',
      },
    }
  })

  it('should return typing activity on handleInvoked', async () => {
    const result = await handler.handleInvoked(activityContext)
    expect(activityContext.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ActivityTypes.Typing,
      })
    )
  })

  it('should send feedback and save file on successful review', async () => {
    mockReadFile.mockResolvedValue('transcript content')
    mockReviewTranscript.mockResolvedValue({
      bgFeedback: 'British feedback',
      hrFeedback: 'HR feedback',
      finalTranscript: 'edited transcript',
    })

    await handler.reviewTranscript(
      activityContext.proactiveSend,
      activityContext.proactiveSendCard,
      activityContext.conversation
    )

    expect(activityContext.proactiveSend).toHaveBeenCalledWith(
      expect.stringContaining('British Grammar and Localisation Expert Feedback:')
    )
    expect(activityContext.proactiveSend).toHaveBeenCalledWith(
      expect.stringContaining('DVLA Content Reviewer Feedback:')
    )
    expect(mockWriteFile).toHaveBeenCalledWith('user456', 'doc123', 'transcript_edited.txt', 'edited transcript')
  })

  it('should send message if no review returned', async () => {
    mockReadFile.mockResolvedValue('transcript content')
    mockReviewTranscript.mockResolvedValue(undefined)

    await handler.reviewTranscript(
      activityContext.proactiveSend,
      activityContext.proactiveSendCard,
      activityContext.conversation
    )

    expect(activityContext.proactiveSend).toHaveBeenCalledWith('No review for this transcript')
  })

  it('should send warning card if no transcript found', async () => {
    mockReadFile.mockResolvedValue(undefined)

    await handler.reviewTranscript(
      activityContext.proactiveSend,
      activityContext.proactiveSendCard,
      activityContext.conversation
    )

    expect(activityContext.proactiveSendCard).toMatchSnapshot()
  })

  it('should send warning card on error', async () => {
    mockReadFile.mockRejectedValue(new Error('fail'))

    await handler.reviewTranscript(
      activityContext.proactiveSend,
      activityContext.proactiveSendCard,
      activityContext.conversation
    )
    expect(activityContext.proactiveSendCard).toMatchSnapshot()
  })
})
