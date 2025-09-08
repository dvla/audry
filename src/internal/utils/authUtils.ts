import { DefaultAzureCredential, TokenCredential } from '@azure/identity'

let azureCredential = null

/**
 * Retrieves Azure credentials for authenticating with Azure services.
 * @returns A TokenCredential instance for Azure authentication
 */
export const getAzureCredentials = (): TokenCredential => {
  if (!azureCredential) {
    azureCredential = new DefaultAzureCredential()
  }
  return azureCredential
}
