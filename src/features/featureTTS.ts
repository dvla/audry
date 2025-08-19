import { z } from 'zod'

import { DEFAULT_GEMINI_TTS_MODEL } from '../internal/config'
import { log } from '../internal/logger'
import { Feature, Variant, getVariant } from './featureFlags'

/**
 * Available Provider options for TTS.
 */
export enum Providers {
  GOOGLE = 'google',
  ELEVEN_LABS = 'elevenlabs',
}

/**
 * Zod schema for validating and inferring TTS model configuration objects.
 * Provides defaults and constraints for each field.
 */
export const TTSModelSchema = z.strictObject({
  provider: z.nativeEnum(Providers).default(Providers.GOOGLE),
  model: z.string().default(DEFAULT_GEMINI_TTS_MODEL),
  temperature: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Controls the randomness of the output. Lower values make it more deterministic. Google default is 1.0'),
})

/**
 * Type inferred from TTSModelSchema for type safety.
 */
export type TTSModelConfig = z.infer<typeof TTSModelSchema>
export const DEFAULT_TTS_MODEL_CONFIG: TTSModelConfig = TTSModelSchema.parse({})
// Use this for ElevenLabs model
// export const DEFAULT_TTS_MODEL_CONFIG: TTSModelConfig = TTSModelSchema.parse({
//   provider: Providers.ELEVEN_LABS,
//   model: 'eleven_multilingual_v2',
// })
export interface TTSVariant extends Variant {
  configuration: TTSModelConfig
}

/**
 * Retrieves the TTS model configuration
 * @returns Promise<Variant | undefined> with the TTS model configuration or undefined if not available
 */
export const getTTSModelConfig = async (): Promise<TTSVariant | undefined> => {
  const config = await getVariant(Feature.TTSModel)
  let modelConfig = DEFAULT_TTS_MODEL_CONFIG
  if (config) {
    log.debug(`TTS Model is: ${config.name}`)
    try {
      modelConfig = TTSModelSchema.parse(config.configuration)
    } catch (err) {
      log.error(`Error parsing TTS model config for variant '${config.name}':`, err)
    }
  }
  return {
    name: config?.name,
    configuration: modelConfig,
  }
}
