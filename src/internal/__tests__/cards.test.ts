import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_CONFIG } from '../../tts/episodeConfig'
import { CARD_ACTION_SET, SHOW_CARD_ACTION, uploadFileCard } from '../cards'

// Mock feature flag so we can toggle UIConfig ON/OFF per test
const mockIsFeatureEnabled = vi.hoisted(() => vi.fn())
vi.mock('../../features/featureFlags', () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
  Feature: { UIConfig: 'uiconfig' },
}))

describe('uploadFileCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders base card without Advanced settings when UIConfig feature is disabled', async () => {
    mockIsFeatureEnabled.mockResolvedValue(false)

    const card = await uploadFileCard('File Processed', 'Body text here', DEFAULT_CONFIG)

    // Should not include Action.ShowCard ("Advanced") when feature is off
    const actions = (card.body?.find((b: any) => b.type === CARD_ACTION_SET)?.actions ?? []) as any[]
    const hasAdvanced = actions.some((a) => a.type === SHOW_CARD_ACTION)
    expect(hasAdvanced).toBe(false)

    expect(card).toMatchSnapshot()
  })

  it('renders card with Advanced settings Action.ShowCard using provided config when UIConfig is enabled', async () => {
    mockIsFeatureEnabled.mockResolvedValue(true)

    const card = await uploadFileCard('File Processed', 'With configuration', DEFAULT_CONFIG)

    // Should include Advanced settings Action.ShowCard
    const actions = (card.body?.find((b: any) => b.type === CARD_ACTION_SET)?.actions ?? []) as any[]
    const showCard = actions.find((a) => a.type === SHOW_CARD_ACTION)
    expect(showCard).toBeDefined()

    // Validate defaults passed through into the inner card inputs
    const innerCard = showCard.card
    const inputs = innerCard.body?.[1]?.items ?? []
    const byId = (id: string) => inputs.find((i: any) => i.id === id)

    expect(byId('kind')?.value).toBe(DEFAULT_CONFIG.kind)
    expect(byId('language')?.value).toBe(DEFAULT_CONFIG.language)
    expect(byId('length')?.value).toBe(DEFAULT_CONFIG.length)
    expect(byId('style')?.value).toBe(DEFAULT_CONFIG.style)
    expect(byId('voices')?.value).toBe(DEFAULT_CONFIG.voices.join(','))

    expect(card).toMatchSnapshot()
  })

  it('does not mutate the base template between calls (deep copy safety)', async () => {
    // First call with feature ON should append Advanced action
    mockIsFeatureEnabled.mockResolvedValue(true)
    const cardWithAdvanced = await uploadFileCard('One', 'A', DEFAULT_CONFIG)
    const actions1 = (cardWithAdvanced.body?.find((b: any) => b.type === CARD_ACTION_SET)?.actions ?? []) as any[]
    expect(actions1.some((a) => a.type === SHOW_CARD_ACTION)).toBe(true)

    // Next call with feature OFF should NOT retain Advanced action
    mockIsFeatureEnabled.mockResolvedValue(false)
    const cardWithoutAdvanced = await uploadFileCard('Two', 'B', DEFAULT_CONFIG)
    const actions2 = (cardWithoutAdvanced.body?.find((b: any) => b.type === CARD_ACTION_SET)?.actions ?? []) as any[]
    expect(actions2.some((a) => a.type === SHOW_CARD_ACTION)).toBe(false)
  })
})
