import { ZodError } from 'zod'

import {
  EpisodeConfig,
  EpisodeIntro,
  EpisodeKind,
  EpisodeLanguages,
  EpisodeLength,
  EpisodeSchema,
  EpisodeVoices,
} from '../episodeConfig'

const simpleConfig: EpisodeConfig = EpisodeSchema.parse({})

describe('Default Episode Config', () => {
  it('should have sensible defaults', () => {
    expect(simpleConfig.language).toBe('English')
    expect(simpleConfig.kind).toBe('Podcast')
    expect(simpleConfig.length).toBe('Full')
    expect(simpleConfig.style).toBe('Conversational')
    expect(simpleConfig.voices).toContain('Matthew')
    expect(simpleConfig.voices).toContain('Ellie')
  })

  it('should have intro_effect, outro_effect set to false', () => {
    expect(simpleConfig.intro_effect).toBeUndefined()
    expect(simpleConfig.outro_effect).toBeUndefined()
  })

  it('simpleConfig should parse correctly', () => {
    expect(() => EpisodeSchema.parse(simpleConfig)).not.toThrow()
    expect(EpisodeSchema.safeParse(simpleConfig).success).toBeTruthy()
  })

  it('should be configurable', () => {
    const customConfig: EpisodeConfig = EpisodeSchema.parse({
      kind: 'News Briefing',
      language: 'Welsh',
      voices: [EpisodeVoices.ELLIE],
      intro_effect: EpisodeIntro.HAPPY10,
    })
    expect(customConfig.language).toBe(EpisodeLanguages.WELSH)
    expect(customConfig.kind).toBe(EpisodeKind.NEWS)
    expect(customConfig.length).toBe(EpisodeLength.FULL)
    expect(customConfig.voices).toContain(EpisodeVoices.ELLIE)
    expect(customConfig.voices.length).toBe(1)
    expect(customConfig.voices).not.toContain(EpisodeVoices.MATTHEW)
    expect(customConfig.intro_effect).toBe(EpisodeIntro.HAPPY10)
    expect(customConfig.outro_effect).toBeUndefined()
  })

  it('should not allow invalid configurations', () => {
    const customConfig = {
      kind: 'Video',
      language: 'Spanish', // Invalid language
    }
    // This should throw a ZodError because 'Video' is not a valid kind
    expect(() => EpisodeSchema.parse(customConfig)).toThrow(ZodError)
  })
})
