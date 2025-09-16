import { describe, expect, it } from 'vitest'

import { EpisodeVoices } from '../episodeConfig'
import { VOICE_CONFIGS, parseTranscriptToSimpleDialogue, parseTranscriptToSpeakerDialogue } from '../textToSpeechEleven'

describe('parseTranscriptToSpeakerDialogue', () => {
  const defaultVoices = [EpisodeVoices.MATTHEW, EpisodeVoices.ELLIE]

  describe('Basic functionality', () => {
    it('should parse simple single speaker transcript', () => {
      const transcript = 'SPEAKER 1: Hello, this is a test message.'

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveLength(1)
      expect(result[0][0]).toEqual({
        text: 'Hello, this is a test message.',
        voiceId: 'wUkGqD7qevNIshEdEC5s', // Matthew's voice ID
      })
    })

    it('should parse transcript with multiple speakers', () => {
      const transcript = `SPEAKER 1: Hello there!
        SPEAKER 2: Hi, how are you doing?
        SPEAKER 1: I'm doing great, thanks for asking.`

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveLength(3)

      expect(result[0][0]).toEqual({
        text: 'Hello there!',
        voiceId: VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)?.voiceId,
      })

      expect(result[0][1]).toEqual({
        text: 'Hi, how are you doing?',
        voiceId: VOICE_CONFIGS.get(EpisodeVoices.ELLIE)?.voiceId,
      })

      expect(result[0][2]).toEqual({
        text: "I'm doing great, thanks for asking.",
        voiceId: VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)?.voiceId,
      })
    })

    it('should handle multiline speaker text', () => {
      const transcript = `SPEAKER 1: This is the first line.
      This is the continuation of the first speaker.
      And this is another line from the same speaker.
      SPEAKER 2: Now the second speaker talks.`

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveLength(2)
      expect(result[0][0]).toEqual({
        text: 'This is the first line. This is the continuation of the first speaker. And this is another line from the same speaker.',
        voiceId: VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)?.voiceId,
      })
      expect(result[0][1]).toEqual({
        text: 'Now the second speaker talks.',
        voiceId: VOICE_CONFIGS.get(EpisodeVoices.ELLIE)?.voiceId,
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle empty transcript', () => {
      const result = parseTranscriptToSpeakerDialogue('', defaultVoices)

      expect(result).toHaveLength(0)
    })

    it('should handle transcript with only whitespace', () => {
      const result = parseTranscriptToSpeakerDialogue('   \n\n   \t  ', defaultVoices)

      expect(result).toHaveLength(0)
    })

    it('should ignore empty lines', () => {
      const transcript = `SPEAKER 1: First message.

      SPEAKER 2: Second message.

      SPEAKER 1: Third message.`

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveLength(3)
    })
  })

  describe('Voice mapping', () => {
    it('should use Matthew voice for speaker 1 by default', () => {
      const transcript = 'SPEAKER 1: Test message'

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

      expect(result[0][0].voiceId).toBe(VOICE_CONFIGS.get(EpisodeVoices.MATTHEW)?.voiceId)
    })
    it('should use custom voices when provided', () => {
      const customVoices = [EpisodeVoices.DANIEL, EpisodeVoices.JAMIE]
      const transcript = `SPEAKER 1: First speaker
      SPEAKER 2: Second speaker`

      const result = parseTranscriptToSpeakerDialogue(transcript, customVoices)

      expect(result[0][0].voiceId).toBe(VOICE_CONFIGS.get(EpisodeVoices.DANIEL)?.voiceId)
      expect(result[0][1].voiceId).toBe(VOICE_CONFIGS.get(EpisodeVoices.JAMIE)?.voiceId)
    })

    it('should fallback to Matthew voice for speakers beyond available voices', () => {
      const transcript = `SPEAKER 1: First speaker
      SPEAKER 2: Second speaker  
      SPEAKER 3: Third speaker should fallback to Matthew`

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices) // Only 2 voices provided

      expect(result[0][2].voiceId).toBe('wUkGqD7qevNIshEdEC5s') // Should fallback to Matthew
    })
  })

  describe('Character count chunking', () => {
    it('should split dialogue into multiple chunks when exceeding MAX_CHAR_COUNT', () => {
      // Create a long text that exceeds MAX_CHAR_COUNT (3000 characters)
      const longText = 'A'.repeat(2000) // 2000 characters
      const veryLongText = 'B'.repeat(2500) // 2500 characters

      const transcript = `SPEAKER 1: ${longText}
      SPEAKER 2: ${veryLongText}`

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

      // Should be split into 2 chunks since 2000 + 2500 > 3000
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveLength(1) // First chunk has first speaker
      expect(result[1]).toHaveLength(1) // Second chunk has second speaker
      expect(result[0][0].text).toBe(longText)
      expect(result[1][0].text).toBe(veryLongText)
    })

    it('should keep dialogue in same chunk when under MAX_CHAR_COUNT', () => {
      const shortText1 = 'A'.repeat(1000) // 1000 characters
      const shortText2 = 'B'.repeat(1000) // 1000 characters

      const transcript = `SPEAKER 1: ${shortText1}
      SPEAKER 2: ${shortText2}`

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

      // Should remain in one chunk since 1000 + 1000 < 3000
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveLength(2)
      expect(result[0][0].text).toBe(shortText1)
      expect(result[0][1].text).toBe(shortText2)
    })

    it('should handle exact MAX_CHAR_COUNT boundary', () => {
      const exactText = 'C'.repeat(3000) // Exactly 3000 characters

      const transcript = `SPEAKER 1: ${exactText}
      SPEAKER 2: One more character`

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

      // Should split because adding "One more character" would exceed limit
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveLength(1)
      expect(result[1]).toHaveLength(1)
    })
  })

  describe('Text processing', () => {
    it('should trim whitespace from individual lines', () => {
      const transcript = `SPEAKER 1:   Hello with spaces   
        This line has leading spaces
          And this one has both    
      SPEAKER 2:   Another speaker with spaces   `

      const result = parseTranscriptToSpeakerDialogue(transcript, defaultVoices)

      expect(result[0][0].text).toBe('Hello with spaces This line has leading spaces And this one has both')
      expect(result[0][1].text).toBe('Another speaker with spaces')
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

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveLength(4)

      expect(result[0][0].text).toBe("Welcome back to the show! Today we're discussing artificial intelligence.")
      expect(result[0][1].text).toBe(
        "Thanks for having me, it's great to be here. I'm excited to dive into this topic."
      )
      expect(result[0][2].text).toBe("So let's start with the basics. What exactly is machine learning?")
      expect(result[0][3].text).toBe(
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

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveLength(3)
      expect(result[0][0].text).toBe("Good morning, I'm your host with the latest tech news.")
      expect(result[0][1].text).toBe(
        'In our first story, a major breakthrough in quantum computing has been announced. Researchers at MIT have developed a new quantum processor. This could revolutionize how we approach complex calculations.'
      )
      expect(result[0][2].text).toBe('Moving on to our next story about renewable energy innovations.')
    })
  })

  describe('parseTranscriptToSimpleDialogue', () => {
    it('returns a single dialogue input for short transcript', () => {
      const transcript = 'Hello world.'
      const voices = [EpisodeVoices.ELLIE]
      const result = parseTranscriptToSimpleDialogue(transcript, voices)
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveLength(1)
      expect(result[0][0].text).toBe(transcript)
      expect(result[0][0].voiceId).toBe(VOICE_CONFIGS.get(EpisodeVoices.ELLIE)?.voiceId)
    })

    it('returns undefined for empty transcript', () => {
      const transcript = ''
      const voices = [EpisodeVoices.ELLIE]
      const result = parseTranscriptToSimpleDialogue(transcript, voices)
      expect(result).toBeUndefined()
    })

    it('returns undefined for transcript longer than MAX_CHAR_COUNT', () => {
      const longTranscript = 'a'.repeat(4000)
      const voices = [EpisodeVoices.ELLIE]
      const result = parseTranscriptToSimpleDialogue(longTranscript, voices)
      expect(result).toBeUndefined()
    })

    it('uses the first voice in voices array', () => {
      const transcript = 'Test voice selection.'
      const voices = [EpisodeVoices.JAMIE, EpisodeVoices.ELLIE]
      const result = parseTranscriptToSimpleDialogue(transcript, voices)
      expect(result[0][0].voiceId).toBe(VOICE_CONFIGS.get(EpisodeVoices.JAMIE)?.voiceId)
    })
  })
})
