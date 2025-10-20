import { z } from 'zod'

/**
 * Supported languages for episodes.
 */
export enum EpisodeLanguages {
  ENGLISH = 'English',
  WELSH = 'Welsh',
}

/**
 * Types of episodes (e.g., Podcast, News Briefing).
 */
export enum EpisodeKind {
  PODCAST = 'Podcast',
  PODCAST_SHORT = 'Brief Podcast',
  NEWS = 'News Briefing',
}
/**
 * Length options for episodes.
 */
export enum EpisodeLength {
  BRIEF = 'Brief',
  FULL = 'Full',
}
/**
 * Style of the episode (Solo, Conversational).
 */
export enum EpisodeStyle {
  SOLO = 'Solo',
  CONVERSATIONAL = 'Conversational',
}

/**
 * Available voice options for TTS.
 */
export enum EpisodeVoices {
  MATTHEW = 'Matthew',
  ELLIE = 'Ellie',
  DANIEL = 'Daniel',
  JAMIE = 'Jamie',
  CLAIRE = 'Claire',
  SAMARA = 'Samara',
  LUCY = 'Lucy',
  EMMA = 'Emma',
}

/**
 * Intro audio effects options.
 */
export enum EpisodeIntro {
  BEAT5 = 'beat5',
  IN5 = 'in5',
  HAPPY10 = 'happy10',
  SYNTH10 = 'synth10',
  WELCOME10 = 'welcome10',
}

/**
 * Outro audio effects options.
 */
export enum EpisodeOutro {
  BEAT5 = 'beat5',
  IN5 = 'in5',
  HAPPY10 = 'happy10',
  SYNTH10 = 'synth10',
  WELCOME10 = 'welcome10',
}

/**
 * Zod schema for validating and inferring episode configuration objects.
 * Provides defaults and constraints for each field.
 */
export const EpisodeSchema = z.object({
  kind: z.nativeEnum(EpisodeKind).default(EpisodeKind.PODCAST),
  language: z.nativeEnum(EpisodeLanguages).default(EpisodeLanguages.ENGLISH),
  length: z.nativeEnum(EpisodeLength).default(EpisodeLength.FULL),
  voices: z.array(z.nativeEnum(EpisodeVoices)).min(1).max(2).default([EpisodeVoices.MATTHEW, EpisodeVoices.ELLIE]),
  style: z.nativeEnum(EpisodeStyle).default(EpisodeStyle.CONVERSATIONAL),
  intro_effect: z.nativeEnum(EpisodeIntro).optional(),
  outro_effect: z.nativeEnum(EpisodeOutro).optional(),
})

/**
 * Type inferred from EpisodeSchema for type safety.
 */
type EpisodeConfig = z.infer<typeof EpisodeSchema>

export const DEFAULT_CONFIG: EpisodeConfig = EpisodeSchema.parse({})
// console.log(z.toJSONSchema(EpisodeSchema))
export type { EpisodeConfig }
