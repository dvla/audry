import { describe, expect, it } from 'vitest'

import { EpisodeConfig, EpisodeKind, EpisodeLength, EpisodeSchema, EpisodeVoices } from '../episodeConfig'
import { promptForTranscript } from '../promptForTranscript'

const defaultConfig: EpisodeConfig = EpisodeSchema.parse({})
describe('promptForTranscript', () => {
  it('includes brief instructions for Brief episodes', () => {
    const config = EpisodeSchema.parse({ length: EpisodeLength.BRIEF })
    const prompt = promptForTranscript(config)
    expect(prompt).toContain('about 1 minute long')
    expect(prompt).toContain('no more than approximately 110 words')
    expect(prompt).not.toContain('about 6 minutes long')
  })

  it('includes full instructions for Full episodes', () => {
    const prompt = promptForTranscript(defaultConfig)
    expect(prompt).toContain('about 6 minutes long')
    expect(prompt).toContain('no more than approximately 1000 words')
    expect(prompt).not.toContain('about 1 minute long')
  })

  it('uses correct speaker names based on voices', () => {
    const promptMatthew = promptForTranscript(defaultConfig)
    expect(promptMatthew).toContain('Speaker 1 is called Matthew')
    expect(promptMatthew).toContain('Speaker 2 is called Ellie')

    const configEllie = EpisodeSchema.parse({ length: EpisodeLength.FULL, voices: [EpisodeVoices.ELLIE] })
    const promptEllie = promptForTranscript(configEllie)
    expect(promptEllie).toContain('Speaker 1 is called Ellie')
    expect(promptEllie).not.toContain('Speaker 2 is called')
  })
})

describe('promptForTranscript with different episode kinds', () => {
  it('uses news instructions for News Briefing kind', () => {
    const config = EpisodeSchema.parse({
      kind: EpisodeKind.NEWS,
      length: EpisodeLength.BRIEF,
      voices: [EpisodeVoices.ELLIE],
    })
    const prompt = promptForTranscript(config)
    expect(prompt).toContain('You are a world-class news writer')
    expect(prompt).toContain('about 1 minute long')
  })

  it('Produces a short podcast', () => {
    const config = EpisodeSchema.parse({
      kind: EpisodeKind.PODCAST_SHORT,
      length: EpisodeLength.BRIEF,
      voices: [EpisodeVoices.ELLIE],
    })
    const prompt = promptForTranscript(config)
    expect(prompt).toContain('You are a world-class podcast writer')
    expect(prompt).toContain('GET STRAIGHT INTO THE CONTENT')
    expect(prompt).toContain('about 1 minute long')
  })
})
