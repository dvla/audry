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
  AZURE = 'azure',
}

/**
 * Zod schema for validating and inferring TTS model configuration objects.
 * Provides defaults and constraints for each field.
 */
export const TTSModelSchema = z.strictObject({
  provider: z.nativeEnum(Providers).default(Providers.GOOGLE),
  model: z.string().default(DEFAULT_GEMINI_TTS_MODEL),
})

/**
 * Type inferred from TTSModelSchema for type safety.
 */
export type TTSModelConfig = z.infer<typeof TTSModelSchema>
export const DEFAULT_TTS_MODEL_CONFIG: TTSModelConfig = TTSModelSchema.parse({})

const OVERRIDE_CONFIG: TTSModelConfig | null = process.env.TTS_MODEL_OVERRIDE
  ? TTSModelSchema.parse(JSON.parse(process.env.TTS_MODEL_OVERRIDE))
  : null
export interface TTSVariant extends Variant {
  configuration: TTSModelConfig
}

/**
 * Retrieves the TTS model configuration
 * @returns Promise<Variant | undefined> with the TTS model configuration or undefined if not available
 */
export const getTTSModelConfig = async (): Promise<TTSVariant | undefined> => {
  if (OVERRIDE_CONFIG) {
    log.info('Using overridden TTS model configuration' + JSON.stringify(OVERRIDE_CONFIG))
    return {
      name: 'overridden',
      configuration: OVERRIDE_CONFIG,
    }
  }
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
