import type { Activity } from 'botbuilder'
import { describe, expect, it } from 'vitest'

import { DEFAULT_USER_ID, getUserId } from '../userUtils'

/**
 * Creates a mock activity for testing purposes.
 * @param name - The name to use for the activity's 'from' property.
 * @returns A mock Activity object.
 */
const makeActivity = (name: string): Activity => ({
  type: 'message',
  id: '',
  timestamp: undefined,
  localTimezone: undefined,
  callerId: undefined,
  serviceUrl: '',
  channelId: '',
  from: { id: '', name },
  conversation: { id: '', isGroup: false, conversationType: '', name: '' },
  recipient: { id: '', name: '' },
  text: '',
  attachments: [],
  entities: [],
  channelData: {},
  locale: '',
  label: undefined,
  valueType: undefined,
  listenFor: undefined,
})

describe('getUserId', () => {
  it('removes special characters and lowercases the name', () => {
    expect(getUserId(makeActivity('John.Doe!@#'))).toBe('johndoe')
    expect(getUserId(makeActivity('Jane_Doe-123'))).toBe('janedoe123')
    expect(getUserId(makeActivity('Élise O’Connor'))).toBe('liseoconnor')
    expect(getUserId(makeActivity('A B C'))).toBe('abc')
    expect(getUserId(makeActivity('User_42'))).toBe('user42')
  })

  it('returns default user ID for only special characters', () => {
    expect(getUserId(makeActivity('!@#$%^&*()'))).toBe(DEFAULT_USER_ID)
  })

  it('handles empty name', () => {
    expect(getUserId(makeActivity(''))).toBe(DEFAULT_USER_ID)
  })

  it('handles null name', () => {
    const activity = makeActivity(null as unknown as string)
    expect(getUserId(activity)).toBe(DEFAULT_USER_ID)
  })

  it('handles already lowercase and alphanumeric', () => {
    expect(getUserId(makeActivity('simpleuser123'))).toBe('simpleuser123')
  })
})
