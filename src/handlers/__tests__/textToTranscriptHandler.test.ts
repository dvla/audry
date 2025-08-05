import { ActivityContext } from 'src/internal/conversationHandlers'
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as cards from '../../internal/cards'
import { DEFAULT_CONFIG } from '../../tts/episodeConfig'
import { TextToTranscriptHandler } from '../textToTranscriptHandler'

const { mockReadFile, mockWriteFile } = vi.hoisted(() => {
  const EXTRACTED_TEXT = 'Information Technology Services Digital and Technology Strategic Plan 2021 24'
  return {
    mockReadFile: vi.fn().mockResolvedValue(EXTRACTED_TEXT),
    mockWriteFile: vi.fn().mockResolvedValue('path/to/transcript.txt'),
  }
})

vi.mock('../../internal/utils/documentUtils', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}))

describe('TextToTranscriptHandler', () => {
  let handler: TextToTranscriptHandler
  let activityContext: ActivityContext

  beforeEach(() => {
    vi.clearAllMocks()

    handler = new TextToTranscriptHandler()
    activityContext = {
      send: vi.fn().mockResolvedValue({}),
      sendCard: vi.fn().mockResolvedValue({}),
      proactiveSend: vi.fn().mockResolvedValue({}),
      proactiveSendCard: vi.fn().mockResolvedValue({}),
      conversation: {
        documentId: 'doc123',
        count: 0,
        documentPath: '',
        audioFilePath: '',
        userId: '',
        config: DEFAULT_CONFIG,
      },
      ref: undefined,
      activity: undefined,
    }

    vi.spyOn(cards, 'processingCard')
    vi.spyOn(cards, 'textToTranscriptCard')
    vi.spyOn(cards, 'warningCard')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return a processing card immediately on handleActionInvoked', async () => {
    await handler.handleActionInvoked(activityContext)
    expect(cards.processingCard).toHaveBeenCalledWith('Generating transcript...')
  })

  it('should send error card if transcript generation fails', async () => {
    mockReadFile.mockRejectedValueOnce(new Error('fail'))

    await handler.generateTranscript(activityContext)

    const cardArgs = (activityContext.proactiveSendCard as Mock).mock.calls[0][0]
    expect(cardArgs).toMatchSnapshot()
    expect(cards.warningCard).toHaveBeenCalledWith('The transcript could not be generated. Please try again later.')
  })
})
