import { AzureAppConfiguration, load } from '@azure/app-configuration-provider'
import { ConfigurationMapFeatureFlagProvider, FeatureManager } from '@microsoft/feature-management'

import { Config } from '../internal/config'
import { getAzureCredentials } from '../internal/utils/authUtils'

// Enum for feature flags
export enum Feature {
  UIConfig = 'uiconfig',
  TTSModel = 'ttsmodel',
  // Add more feature flags here as needed
}

/** * Interface for feature flag variants */
export interface Variant {
  name: string
  configuration: unknown
}

let appConfig: AzureAppConfiguration | null = null
let featureManager: FeatureManager | null = null

/**
 * Retrieves the feature manager instance.
 * @returns Promise<FeatureManager | null> with the feature manager or null if not available
 */
const getFeatureManager = async () => {
  if (!featureManager && Config.APP_CONFIG_ENDPOINT) {
    appConfig = await load(Config.APP_CONFIG_ENDPOINT, getAzureCredentials(), {
      startupOptions: {
        timeoutInMs: 60_000, // 60 seconds
      },
      refreshOptions: {
        enabled: true,
        refreshIntervalInMs: 90_000, // Refresh every 90 seconds
      },
      featureFlagOptions: {
        enabled: true,
        // Note: selectors must be explicitly provided for feature flags.
        selectors: [
          {
            keyFilter: '*',
          },
        ],
        refresh: {
          enabled: true,
          refreshIntervalInMs: 90_000, // Refresh every 90 seconds
        },
      },
    })
    featureManager = new FeatureManager(new ConfigurationMapFeatureFlagProvider(appConfig))
  }
  if (appConfig) {
    await appConfig.refresh() // Ensure the latest configuration is loaded
  }
  return featureManager
}

/**
 * Checks if a feature flag is enabled in Azure App Configuration.
 * @param feature Feature enum value
 * @returns Promise<boolean> indicating if the feature is enabled
 */
export const isFeatureEnabled = async (feature: Feature): Promise<boolean> => {
  try {
    const fm = await getFeatureManager()
    if (fm) {
      return await fm.isEnabled(feature)
    }
  } catch (err) {
    // Log error and default to disabled for safety
    console.error(`Error checking feature flag '${feature}':`, err)
  }
  // Return false when feature manager is not available or error occurs
  return false
}

/**
 * Retrieves the variant configuration for a feature flag.
 * @param feature Feature enum value
 * @returns Promise<Variant | undefined> with the variant configuration or undefined if not available
 */
export const getVariant = async (feature: Feature): Promise<Variant | undefined> => {
  try {
    const fm = await getFeatureManager()
    if (fm) {
      return await fm.getVariant(feature as string)
    }
  } catch (err) {
    // Log error and return undefined for safety
    console.error(`Error getting variant for feature '${feature}':`, err)
  }
  // Return undefined when feature manager is not available or error occurs
  return undefined
}
