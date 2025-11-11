import { DefaultAzureCredential, ManagedIdentityCredential, TokenCredential } from '@azure/identity'

import { log } from '../logger'

let azureCredential = null

/**
 * Retrieves Azure credentials for authenticating with Azure services.
 * @returns A TokenCredential instance for Azure authentication
 */
export const getAzureCredentials = (): TokenCredential => {
  if (!azureCredential) {
    if (process.env.RUNNING_ON_AZURE) {
      azureCredential = new ManagedIdentityCredential({
        clientId: process.env.AZURE_CLIENT_ID,
      })
      log.info('Using Managed Identity Credential for Azure authentication.')
    } else {
      azureCredential = new DefaultAzureCredential()
      log.info('Using Default Azure Credential for Azure authentication.')
    }
  }
  return azureCredential
}
