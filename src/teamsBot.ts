import { Application } from '@microsoft/teams-ai'
import { MemoryStorage, Storage } from 'botbuilder'
import { CosmosDbPartitionedStorage } from 'botbuilder-azure'

import { Config } from './internal/config'
import { ApplicationTurnState } from './internal/conversationHandlers'
import { log } from './internal/logger'

/**
 * Returns a storage instance based on the current configuration.
 *
 * If the required CosmosDB configuration values are present, this function returns a
 * `CosmosDbPartitionedStorage` instance for persistent storage. Otherwise, it falls back
 * to using `MemoryStorage` for in-memory storage.
 *
 * It is designed to be called once so there is no caching of the storage instance.
 *
 * @returns {Storage} An instance of either `CosmosDbPartitionedStorage` or `MemoryStorage`
 *                    depending on the configuration.
 */
export const getMemory = (): Storage => {
  if (Config.COSMOSDB_ENDPOINT && Config.COSMOSDB_DATABASE && Config.COSMOSDB_CONTAINER && Config.COSMOSDB_AUTH_KEY) {
    try {
      const cosmosStorage = new CosmosDbPartitionedStorage({
        cosmosDbEndpoint: Config.COSMOSDB_ENDPOINT,
        authKey: Config.COSMOSDB_AUTH_KEY,
        databaseId: Config.COSMOSDB_DATABASE,
        containerId: Config.COSMOSDB_CONTAINER,
        compatibilityMode: false,
      })
      log.info('Using CosmosDB for storage')
      return cosmosStorage
    } catch (error) {
      log.error('Error initializing CosmosDB storage:', error)
    }
  }
  log.info('Using Memory for storage')
  return new MemoryStorage()
}

// Define storage and application
export const app = new Application<ApplicationTurnState>({
  storage: getMemory(),
})
