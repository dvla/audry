import { speaker } from '@elevenlabs/elevenlabs-js/api/resources/dubbing/resources/resource'
import { describe, expect, it } from 'vitest'

import { EpisodeVoices } from '../episodeConfig'
import { VOICE_CONFIGS, parseTranscriptToSpeakerDialogue } from '../textToSpeechAzure'

const defaultVoices = [EpisodeVoices.MATTHEW, EpisodeVoices.ELLIE]

describe('Basic functionality', () => {
  it('should parse simple single speaker transcript', () => {
    const transcript = 'SPEAKER 1: Hello, this is a test message.'

    const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: 'Hello, this is a test message.',
      speaker: 'en-GB-OllieMultilingualNeural',
    })
  })

  it('should parse transcript with multiple speakers', () => {
    const transcript = `SPEAKER 1: Hello there!
          SPEAKER 2: Hi, how are you doing?
          SPEAKER 1: I'm doing great, thanks for asking.`

    const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      text: 'Hello there!',
      speaker: VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)?.voiceId,
    })

    expect(result[1]).toEqual({
      text: 'Hi, how are you doing?',
      speaker: VOICE_CONFIGS.get(EpisodeVoices.ELLIE)?.voiceId,
    })

    expect(result[2]).toEqual({
      text: "I'm doing great, thanks for asking.",
      speaker: VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)?.voiceId,
    })
  })

  it('should handle multiline speaker text', () => {
    const transcript = `SPEAKER 1: This is the first line.
        This is the continuation of the first speaker.
        And this is another line from the same speaker.
        SPEAKER 2: Now the second speaker talks.`

    const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      text: 'This is the first line. This is the continuation of the first speaker. And this is another line from the same speaker.',
      speaker: VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)?.voiceId,
    })
    expect(result[1]).toEqual({
      text: 'Now the second speaker talks.',
      speaker: VOICE_CONFIGS.get(EpisodeVoices.ELLIE)?.voiceId,
    })
  })
})

describe('Real-world examples', () => {
  it('should handle podcast-style dialogue', () => {
    const transcript = `SPEAKER 1: Welcome back to the show! Today we're discussing artificial intelligence.

        SPEAKER 2: Thanks for having me, it's great to be here.
        I'm excited to dive into this topic.

        SPEAKER 1: So let's start with the basics.
        What exactly is machine learning?

        SPEAKER 2: Well, machine learning is a subset of AI.
        It's about teaching computers to learn patterns from data.
        Without being explicitly programmed for every scenario.`

    const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

    expect(result).toHaveLength(4)

    expect(result[0].text).toBe("Welcome back to the show! Today we're discussing artificial intelligence.")
    expect(result[1].text).toBe("Thanks for having me, it's great to be here. I'm excited to dive into this topic.")
    expect(result[2].text).toBe("So let's start with the basics. What exactly is machine learning?")
    expect(result[3].text).toBe(
      "Well, machine learning is a subset of AI. It's about teaching computers to learn patterns from data. Without being explicitly programmed for every scenario."
    )
  })

  it('should handle news briefing style', () => {
    const transcript = `SPEAKER 1: Good morning, I'm your host with the latest tech news.

        SPEAKER 1: In our first story, a major breakthrough in quantum computing has been announced.
        Researchers at MIT have developed a new quantum processor.
        This could revolutionize how we approach complex calculations.

        SPEAKER 1: Moving on to our next story about renewable energy innovations.`

    const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

    expect(result).toHaveLength(3)
    expect(result[0].text).toBe("Good morning, I'm your host with the latest tech news.")
    expect(result[1].text).toBe(
      'In our first story, a major breakthrough in quantum computing has been announced. Researchers at MIT have developed a new quantum processor. This could revolutionize how we approach complex calculations.'
    )
    expect(result[2].text).toBe('Moving on to our next story about renewable energy innovations.')
  })
})

describe('Advanced transcript structures', () => {
  it('should handle interruptions and overlapping speech', () => {
    const transcript = `
    Speaker 1: Alright everyone, welcome back to the podcast! Today, we're diving into the thrilling world of… *drumroll*… intranet content! 
    Speaker 2: Woah Matthew, I didn't know content could be thrilling? 
    Speaker 1: I know Ellie, sounds crazy right. But, hear me out! We're calling this one, "MyDVLA: Crafting Content That Doesn't Make People Want to Cry." It's all about how to write amazing stuff for MyDVLA, the DVLA intranet. The better the content, the easier it is for our colleagues to find what they need, and the less likely they are to, well, lose their minds from frustration. 
    Speaker 2: Okay, that actually sounds… useful. So, like, what are the biggest sins of intranet writing? 
    Speaker 1: Oh, where do I even begin? I think it all stems from thinking people will actually *read* everything you write. People are scanning, Ellie, *scanning* like hawks! 
    Speaker 2: Okay, so... less "War and Peace," more "SparkNotes"? 
    Speaker 1: Exactly! First up: ditch the fluff. No more "Welcome to our page!" Just get straight to the point. Imagine you're explaining something to someone who's already late for a meeting, that's the kind of urgency we are going for. 
    Speaker 2: Right, like when I'm trying to explain to my friend why his car insurance went up AGAIN. 
    Speaker 1: Precisely! He doesn't want a history of the insurance industry, he just wants to know why hes paying more! 
    Speaker 2: Hmmm, right. So, what's next? 
    Speaker 2: Great Matthew, thanks for explaining that, until next time folks!
    `
    const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)
    expect(result).toHaveLength(11)
  })
})
describe('Voice mapping', () => {
  it('should use Matthew voice for speaker 1 by default', () => {
    const transcript = 'SPEAKER 1: Test message'

    const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

    expect(result[0].speaker).toBe(VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)?.voiceId)
  })
  it('should use custom voices when provided', () => {
    const customVoices = [EpisodeVoices.DANIEL, EpisodeVoices.JAMIE]
    const transcript = `SPEAKER 1: First speaker
      SPEAKER 2: Second speaker`

    const result = parseTranscriptToSpeakerDialogue(transcript, customVoices)

    expect(result[0].speaker).toBe(VOICE_CONFIGS.get(EpisodeVoices.DANIEL)?.voiceId)
    expect(result[1].speaker).toBe(VOICE_CONFIGS.get(EpisodeVoices.JAMIE)?.voiceId)
  })

  it('should fallback to Matthew voice for speakers beyond available voices', () => {
    const transcript = `SPEAKER 1: First speaker
      SPEAKER 2: Second speaker  
      SPEAKER 3: Third speaker should fallback to Matthew`

    const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices) // Only 2 voices provided

    expect(result[2].speaker).toBe('en-GB-OllieMultilingualNeural') // Should fallback to Matthew
  })
})
