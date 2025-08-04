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
  intro_effect: z.boolean().default(false),
  outro_effect: z.boolean().default(false),
})

/**
 * Type inferred from EpisodeSchema for type safety.
 */
type EpisodeConfig = z.infer<typeof EpisodeSchema>

export const DEFAULT_CONFIG: EpisodeConfig = EpisodeSchema.parse({})
// console.log(z.toJSONSchema(EpisodeSchema))
export type { EpisodeConfig }
