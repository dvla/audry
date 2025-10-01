import { Activity } from 'botbuilder'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ActivityContext } from '../../internal/conversationHandlers'
import { DEFAULT_CONFIG } from '../../tts/episodeConfig'
import { DialogHandler } from '../dialogHandler'

const { mockReadFile, mockWriteFile, mockGetTranscripts } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockGetTranscripts: vi.fn(),
}))

vi.mock('../../internal/utils/documentUtils', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  getTranscripts: mockGetTranscripts,
  TRANSCRIPT_TEXT: 'transcript.txt',
  EDITED_TRANSCRIPT_TEXT: 'transcript_edited.txt',
}))

describe('DialogHandler', () => {
  let handler: DialogHandler
  let activityContext: ActivityContext

  const createActivityContext = (overrides: Partial<ActivityContext> = {}): ActivityContext => {
    const baseActivity: Activity = {
      type: 'invoke',
      value: {
        data: {
          action: 'cancel',
          index: 0,
        },
      },
    } as Activity

    const baseContext = {
      send: vi.fn().mockResolvedValue({}),
      sendCard: vi.fn().mockResolvedValue({}),
      proactiveSend: vi.fn().mockResolvedValue(undefined),
      proactiveSendCard: vi.fn().mockResolvedValue(undefined),
      updateCard: vi.fn().mockResolvedValue(undefined),
      conversation: {
        documentId: 'doc123',
        userId: 'user456',
        count: 0,
        documentPath: '',
        audioFilePath: '',
        config: DEFAULT_CONFIG,
      },
      activity: baseActivity,
      ref: {},
    } satisfies ActivityContext

    return {
      ...baseContext,
      ...overrides,
      conversation: {
        ...baseContext.conversation,
        ...overrides.conversation,
      },
      activity: overrides.activity ?? baseContext.activity,
    } as ActivityContext
  }

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new DialogHandler()
    activityContext = createActivityContext()
  })

  describe('dialogCard', () => {
    it('should render transcript dialog card snapshot', async () => {
      mockReadFile.mockResolvedValueOnce('Speaker 1: Hello\nSpeaker 2: Welcome')

      const card = await handler.dialogCard('user456', 'doc123', 0)

      expect(mockReadFile).toHaveBeenCalledWith('user456', 'doc123', 'transcript.txt')
      expect(card).toMatchSnapshot()
    })
  })

  describe('handleDialogInvoke', () => {
    it('should send dialog response with snapshot', async () => {
      mockReadFile.mockResolvedValueOnce('Speaker 1: Hello\nSpeaker 2: Welcome')
      const send = vi.fn().mockResolvedValue({})

      const context = createActivityContext({
        send: send as ActivityContext['send'],
        activity: {
          type: 'invoke',
          value: {
            data: {
              index: 1,
            },
          },
        } as Activity,
      })

      await handler.handleDialogInvoke(context)

      expect(send).toMatchSnapshot()
      expect(mockReadFile).toHaveBeenCalledWith('user456', 'doc123', 'transcript_edited.txt')
    })
  })

  it('should handle a transcript with text before Speaker 1', async () => {
    mockReadFile.mockResolvedValueOnce('```textSpeaker 1: Hello\nSpeaker 2: Welcome')
    const send = vi.fn().mockResolvedValue({})

    const context = createActivityContext({
      send: send as ActivityContext['send'],
      activity: {
        type: 'invoke',
        value: {
          data: {
            index: 1,
          },
        },
      } as Activity,
    })

    await handler.handleDialogInvoke(context)

    expect(send).toMatchSnapshot()
    expect(mockReadFile).toHaveBeenCalledWith('user456', 'doc123', 'transcript_edited.txt')
  })

  describe('handleDialogSubmit', () => {
    it('should toggle edit and refresh dialog and carousel cards', async () => {
      mockReadFile.mockResolvedValue('Speaker 1: Original host\nSpeaker 2: Original guest')
      mockGetTranscripts.mockResolvedValue(['Original transcript', 'Edited transcript'])

      const send = vi.fn().mockResolvedValue({})
      const updateCard = vi.fn().mockResolvedValue(undefined)

      const context = createActivityContext({
        send: send as ActivityContext['send'],
        updateCard: updateCard as ActivityContext['updateCard'],
        activity: {
          type: 'invoke',
          value: {
            data: {
              action: 'toggleEdit',
              index: 0,
              edit_0: 'Updated host line',
              edit_1: 'Updated guest line',
            },
          },
        } as Activity,
      })

      await handler.handleDialogSubmit(context)

      expect(mockWriteFile).toHaveBeenCalledWith(
        'user456',
        'doc123',
        'transcript.txt',
        'Speaker 1: Updated host line\n\nSpeaker 2: Updated guest line'
      )
      expect(send).toMatchSnapshot()
      expect(updateCard.mock.calls[0][0]).toMatchSnapshot()
    })

    it('should save transcript and close dialog', async () => {
      mockGetTranscripts.mockResolvedValue(['Transcript A', 'Transcript B'])

      const send = vi.fn().mockResolvedValue({})
      const updateCard = vi.fn().mockResolvedValue(undefined)

      const context = createActivityContext({
        send: send as ActivityContext['send'],
        updateCard: updateCard as ActivityContext['updateCard'],
        activity: {
          type: 'invoke',
          value: {
            data: {
              action: 'saveTranscript',
              index: 1,
              edit_0: 'Edited host',
              edit_1: 'Edited guest',
            },
          },
        } as Activity,
      })

      await handler.handleDialogSubmit(context)

      expect(mockWriteFile).toHaveBeenCalledWith(
        'user456',
        'doc123',
        'transcript_edited.txt',
        'Speaker 1: Edited host\n\nSpeaker 2: Edited guest'
      )
      expect(send.mock.calls[0][0]).toMatchSnapshot()
      expect(updateCard.mock.calls[0][0]).toMatchSnapshot()
    })

    it('should cancel dialog on unknown action', async () => {
      const send = vi.fn().mockResolvedValue({})

      const context = createActivityContext({
        send: send as ActivityContext['send'],
        activity: {
          type: 'invoke',
          value: {
            data: {
              action: 'cancel',
              index: 0,
            },
          },
        } as Activity,
      })

      await handler.handleDialogSubmit(context)

      expect(mockWriteFile).not.toHaveBeenCalled()
      expect(send.mock.calls[0][0]).toMatchSnapshot()
    })
  })

  describe('transcript helpers', () => {
    it('should split transcript with alternating speakers', () => {
      const turns = handler.getTranscriptTurns([
        'Speaker 1: Hello there',
        'Speaker 2: Welcome to the show',
        'Speaker 1: Another update',
      ])

      expect(turns).toMatchSnapshot()
    })

    it('should generate transcript blocks with edit controls', () => {
      const blocks = handler.generateTranscriptBlocks(
        [
          { speaker: 'Speaker 1', text: 'Hello host' },
          { speaker: 'Speaker 2', text: 'Guest reply' },
        ],
        1
      )

      expect(blocks).toMatchSnapshot()
    })

    it('should rebuild transcript string from activity edits', () => {
      const activity = {
        value: {
          data: {
            edit_0: 'Updated host',
            edit_1: 'Updated guest',
          },
        },
      } as Activity

      const result = handler.updateTranscript(activity)

      expect(result).toBe('Speaker 1: Updated host\n\nSpeaker 2: Updated guest')
    })
  })
})
