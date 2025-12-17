targetScope = 'subscription'

@maxLength(20)
@minLength(4)
@description('Used to generate names for all resources in this file')
param resourceBaseName string

@maxLength(42)
param botDisplayName string
param environmentName string
param geminiApiKey string
param location string
param tenantId string
param webAppSKU string

resource rg 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: 'rg-${resourceBaseName}-${environmentName}-uks'
  location: location
}

module identity './identity.bicep' = {
  name: 'Azure-Identity'
  scope: rg
  params: {
    location: location
    identityName: 'mi-${resourceBaseName}-${environmentName}-uks'
  }
}

module webapp './webapp.bicep' = {
  name: 'Azure-WebApp'
  scope: rg
  params: {
    appiInstrumentationKey: appInsights.outputs.applicationInsightsInstrumentationKey
    appiConnectionString: appInsights.outputs.applicationInsightsConnectionString
    botId: identity.outputs.clientId
    cosmosDbEndpoint: cosmosDB.outputs.cosmosDbEndpoint
    cosmosDbDatabase: cosmosDB.outputs.cosmosDbDatabase
    cosmosDbContainer: cosmosDB.outputs.cosmosDbContainer
    cosmosDbAuthKey: cosmosDB.outputs.cosmosDbAuthKey
    docIntEndpoint: docIntelligence.outputs.docIntEndpoint
    speechServiceEndpoint: speech.outputs.speechEndpoint
    speechServiceKey: speech.outputs.speechKey
    environmentName: environmentName
    geminiApiKey: geminiApiKey
    identityId: identity.outputs.identityId
    location: location
    serverfarmName: 'farm-${resourceBaseName}-${environmentName}-uks'
    storageAccountName: storage.outputs.storageAccountName
    storageBlobContainer: storage.outputs.blobContainerName
    tenantId: tenantId
    userAssignedIdentityPrincipalId: identity.outputs.principalId
    webAppName: 'app-${resourceBaseName}-${environmentName}-uks'
    webAppSKU: webAppSKU
    webAppConfigName: 'appconfig-${resourceBaseName}-${environmentName}-uks'
  }
}

// Register your web service as a bot with the Bot Framework
module azureBotRegistration './bot.bicep' = {
  name: 'Azure-Bot-Registration'
  scope: rg
  params: {
    identityClientId: identity.outputs.clientId
    identityResourceId: identity.outputs.identityId
    identityTenantId: tenantId
    botAppDomain: webapp.outputs.defaultHostName
    botDisplayName: botDisplayName
    botServiceName: 'bot-${resourceBaseName}-${environmentName}-uks'
  }
}

module docIntelligence './docint.bicep' = {
  name: 'Azure-Doc-Intelligence'
  scope: rg
  params: {
    docIntName: 'docint-${resourceBaseName}-${environmentName}-uks'
    location: 'uksouth'
    userAssignedIdentityPrincipalId: identity.outputs.principalId
    docIntBaseName: '${resourceBaseName}-${environmentName}'
    skuName: 'S0'
  }
}

module cosmosDB './cosmos.bicep' = {
  name: 'Azure-CosmosDB'
  scope: rg
  params: {
    cosmosDbAccountName: 'cosmos-${resourceBaseName}-${environmentName}-uks'
    userAssignedIdentityPrincipalId: identity.outputs.principalId
  }
}

module appInsights './appin.bicep' = {
  name: 'Azure-AppInsights'
  scope: rg
  params: {
    appInsightsName: 'appi-${resourceBaseName}-${environmentName}-uks'
    logAnalyticsWorkspaceName: 'log-${resourceBaseName}-${environmentName}-uks'
    userAssignedIdentityPrincipalId: identity.outputs.principalId
  }
}

module speech './speech.bicep' = {
  name: 'Azure-Speech'
  scope: rg
  params: {
    speechName: 'speech-${resourceBaseName}-${environmentName}-uks'
    location: location
  }
}

module storage './storage.bicep' = {
  name: 'Azure-Storage'
  scope: rg
  params: {
    storageAccountName: 'st${resourceBaseName}${environmentName}uks'
    containerName: 'audry'
    userAssignedIdentityPrincipalId: identity.outputs.principalId
  }
}

// The output will be persisted in .env.{envName}. Visit https://aka.ms/teamsfx-actions/arm-deploy for more details.
output bot_azure_app_service_resource_id string = webapp.outputs.webAppId
output bot_domain string = webapp.outputs.defaultHostName
output bot_id string = identity.outputs.clientId
output blob_endpoint string = storage.outputs.blobEndpoint
output blob_container_name string = storage.outputs.blobContainerName
output doc_int_endpoint string = docIntelligence.outputs.docIntEndpoint
