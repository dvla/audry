import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_CONFIG } from '../../tts/episodeConfig'
import { CARD_ACTION_SET, SHOW_CARD_ACTION, uploadFileCard } from '../cards'

// Mock feature flag so we can toggle UIConfig ON/OFF per test
const mockIsFeatureEnabled = vi.hoisted(() => vi.fn())
vi.mock('../../features/featureFlags', () => ({
  isFeatureEnabled: mockIsFeatureEnabled,
  Feature: { ExtendedConfig: 'exconfig' },
}))

describe('uploadFileCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders base card without Extended settings when ExtendedConfig feature is disabled', async () => {
    mockIsFeatureEnabled.mockResolvedValue(false)

    const card = await uploadFileCard('File Processed', 'Body text here', DEFAULT_CONFIG)

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
    expect(byId('voices')?.value).toBe(DEFAULT_CONFIG.voices.join(','))
    expect(byId('intro_effect')?.choices).toBeUndefined()
    expect(byId('outro_effect')?.choices).toBeUndefined()
    expect(card).toMatchSnapshot()
  })

  it('renders card with Advanced settings Action.ShowCard using provided config when Extended is enabled', async () => {
    mockIsFeatureEnabled.mockResolvedValue(true)

    const card = await uploadFileCard('File Processed', 'With configuration', DEFAULT_CONFIG)

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
    expect(byId('voices')?.value).toBe(DEFAULT_CONFIG.voices.join(','))
    expect(byId('intro_effect').choices).toBeDefined()
    expect(byId('outro_effect').choices).toBeDefined()
    expect(card).toMatchSnapshot()
  })
})
