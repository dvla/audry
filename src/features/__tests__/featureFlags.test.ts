import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Variant } from '../featureFlags'
import { Feature, getVariant, isFeatureEnabled } from '../featureFlags'
import { DEFAULT_TTS_MODEL_CONFIG, getTTSModelConfig } from '../featureTTS'

// Mock Azure App Configuration modules with hoisted functions
const mockLoad = vi.hoisted(() => vi.fn())
const mockFeatureManager = vi.hoisted(() => ({
  isEnabled: vi.fn(),
  getVariant: vi.fn(),
}))
const mockConfigurationMapFeatureFlagProvider = vi.hoisted(() => vi.fn(() => ({})))
const mockAppConfig = vi.hoisted(() => ({
  refresh: vi.fn(),
}))
vi.mock('@azure/app-configuration-provider', () => ({
  load: mockLoad,
}))

vi.mock('@microsoft/feature-management', () => ({
  ConfigurationMapFeatureFlagProvider: mockConfigurationMapFeatureFlagProvider,
  FeatureManager: vi.fn(() => mockFeatureManager),
}))

vi.mock('../../internal/config', async () => {
  const actual = await vi.importActual<typeof import('../../internal/config')>('../../internal/config')
  return {
    Config: {
      ...actual.Config,
      APP_CONFIG_ENDPOINT: 'https://mock-app-config.azconfig.io',
    },
    DEFAULT_GEMINI_TTS_MODEL: 'gemini-great-tts',
  }
})

// Mock file utils
vi.mock('../../internal/utils/fileUtils', () => ({
  getAzureCredentials: vi.fn(() => ({})),
}))

describe('featureFlags', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('isFeatureEnabled', () => {
    it('should return true when feature is enabled', async () => {
      mockLoad.mockResolvedValue(mockAppConfig)
      mockFeatureManager.isEnabled.mockResolvedValue(true)

      const result = await isFeatureEnabled(Feature.UIConfig)

      expect(result).toBe(true)
      expect(mockFeatureManager.isEnabled).toHaveBeenCalledExactlyOnceWith(Feature.UIConfig)
    })

    it('should return false when feature is disabled', async () => {
      mockLoad.mockResolvedValue(mockAppConfig)
      mockFeatureManager.isEnabled.mockResolvedValue(false)

      const result = await isFeatureEnabled(Feature.TTSModel)

      expect(result).toBe(false)
      expect(mockFeatureManager.isEnabled).toHaveBeenCalledExactlyOnceWith(Feature.TTSModel)
    })

    it('should return false and log error when feature check throws', async () => {
      mockLoad.mockResolvedValue(mockAppConfig)
      mockFeatureManager.isEnabled.mockRejectedValue(new Error('Connection failed'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await isFeatureEnabled(Feature.UIConfig)

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(
        "Error checking feature flag 'uiconfig':",
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('getVariant', () => {
    it('should return variant when available', async () => {
      const mockVariant: Variant = {
        name: 'test-variant',
        configuration: { key: 'value' },
      }
      mockLoad.mockResolvedValue({})
      mockFeatureManager.getVariant.mockResolvedValue(mockVariant)

      const result = await getVariant(Feature.TTSModel)

      expect(result).toEqual(mockVariant)
      expect(mockFeatureManager.getVariant).toHaveBeenCalledExactlyOnceWith(Feature.TTSModel)
    })

    it('should return undefined when no variant is available', async () => {
      mockLoad.mockResolvedValue({})
      mockFeatureManager.getVariant.mockResolvedValue(undefined)

      const result = await getVariant(Feature.UIConfig)

      expect(result).toBeUndefined()
      expect(mockFeatureManager.getVariant).toHaveBeenCalledExactlyOnceWith(Feature.UIConfig)
    })

    it('should return undefined and log error when variant retrieval throws', async () => {
      mockLoad.mockResolvedValue({})
      mockFeatureManager.getVariant.mockRejectedValue(new Error('Network error'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await getVariant(Feature.TTSModel)

      expect(result).toBeUndefined()
      expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(
        "Error getting variant for feature 'ttsmodel':",
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('getTTSModelConfig', () => {
    it('should return parsed TTS model config when variant is available', async () => {
      const mockVariant: Variant = {
        name: 'google-variant',
        configuration: { provider: 'google', model: 'gemini-1.5-flash' },
      }
      const parsedConfig = { provider: 'google', model: 'gemini-1.5-flash', temperature: 0.2 }

      mockLoad.mockResolvedValue(mockAppConfig)
      mockFeatureManager.getVariant.mockResolvedValue(mockVariant)
      const result = await getTTSModelConfig()

      expect(result).toEqual({
        name: 'google-variant',
        configuration: parsedConfig,
      })
    })

    it('should return default config undefined configuration when no variant is available', async () => {
      mockLoad.mockResolvedValue({})
      mockFeatureManager.getVariant.mockResolvedValue(undefined)

      const result = await getTTSModelConfig()

      expect(result).toEqual({ name: undefined, configuration: DEFAULT_TTS_MODEL_CONFIG })
    })

    it('should handle schema parsing errors gracefully', async () => {
      const mockVariant: Variant = {
        name: 'invalid-variant',
        configuration: { invalid: 'invalid-provider' },
      }

      mockLoad.mockResolvedValue({})
      mockFeatureManager.getVariant.mockResolvedValue(mockVariant)

      const result = await getTTSModelConfig()
      expect(result).toEqual({ name: 'invalid-variant', configuration: DEFAULT_TTS_MODEL_CONFIG })
    })
  })
})
