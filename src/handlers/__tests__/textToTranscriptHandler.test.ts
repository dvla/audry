import { ActivityContext } from 'src/internal/conversationHandlers'
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as cards from '../../internal/cards'
import * as documentUtils from '../../internal/utils/documentUtils'
import { textToTranscript } from '../../tts/textToTranscript'
import { TextToTranscriptHandler } from '../textToTranscriptHandler'

const EXTRACTED_TEXT = 'Information Technology Services  Digital and Technology Strategic Plan  2021 24'
const TRANSCRIPT =
  "Speaker 1: Ellie, welcome to another electrifying episode! Today, we're diving deep into something that might sound a bit dry at first, but trust me, it's the backbone of how things get done in the modern world."

vi.mock('../../internal/utils/documentUtils')
vi.mock('../../tts/textToTranscript')

describe('TextToTranscriptHandler', () => {
  let handler: TextToTranscriptHandler
  let activityContext: ActivityContext

  beforeEach(() => {
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
      },
      ref: undefined,
      activity: undefined,
    }
    ;(documentUtils.getExtractedText as any).mockResolvedValue(EXTRACTED_TEXT)
    ;(textToTranscript as any).mockResolvedValue(TRANSCRIPT)
    ;(documentUtils.writeTranscript as any).mockResolvedValue('path/to/transcript.txt')
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

  it('should generate transcript and send success card', async () => {
    await handler.generateTranscript(activityContext)
    expect(documentUtils.getExtractedText).toHaveBeenCalledWith('doc123')
    expect(textToTranscript).toHaveBeenCalledWith(EXTRACTED_TEXT)
    expect(documentUtils.writeTranscript).toHaveBeenCalledWith(TRANSCRIPT, 'doc123')
    const cardArgs = (activityContext.proactiveSendCard as Mock).mock.calls[0][0]
    expect(cardArgs).toMatchSnapshot()
    expect(cards.textToTranscriptCard).toHaveBeenCalledWith('Transcript Created', TRANSCRIPT)
  })

  it('should send error card if transcript generation fails', async () => {
    ;(documentUtils.getExtractedText as any).mockRejectedValue(new Error('fail'))
    await handler.generateTranscript(activityContext)
    const cardArgs = (activityContext.proactiveSendCard as Mock).mock.calls[0][0]
    expect(cardArgs).toMatchSnapshot()
    expect(cards.warningCard).toHaveBeenCalledWith('The transcript could not be generated. Please try again later.')
  })
})
