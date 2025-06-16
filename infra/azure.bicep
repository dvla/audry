targetScope = 'subscription'

@maxLength(20)
@minLength(4)
@description('Used to generate names for all resources in this file')
param resourceBaseName string

@maxLength(42)
param botDisplayName string
param botId string
@secure()
param botPassword string
param environmentName string
param location string
param tenantId string
param webAppSKU string


resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
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
    location: location
    serverfarmName: 'farm-${resourceBaseName}-${environmentName}-uks'
    webAppName: 'app-${resourceBaseName}-${environmentName}-uks'
    botId: botId
    botPassword: botPassword
    tenantId: tenantId
    webAppSKU: webAppSKU
    identityId: identity.outputs.identityId
    appiInstrumentationKey: appInsights.outputs.applicationInsightsInstrumentationKey
    appiConnectionString: appInsights.outputs.applicationInsightsConnectionString
    cosmosDbEndpoint: cosmosDB.outputs.cosmosDbEndpoint
    cosmosDbDatabase: cosmosDB.outputs.cosmosDbDatabase
    cosmosDbContainer: cosmosDB.outputs.cosmosDbContainer
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
module cosmosDB './cosmos.bicep' = {
  name: 'Azure-CosmosDB'
  scope: rg
  params: {
    cosmosDbAccountName: 'cosmos-${resourceBaseName}-${environmentName}-uks'
    userAssignedIdentityPrincipalId: identity.outputs.principalId
    //currentUserId: principalType == 'User' ? currentUserId : ''
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

// The output will be persisted in .env.{envName}. Visit https://aka.ms/teamsfx-actions/arm-deploy for more details.
output BOT_AZURE_APP_SERVICE_RESOURCE_ID string = webapp.outputs.webAppId
output BOT_DOMAIN string = webapp.outputs.defaultHostName
output BOT_ID string = identity.outputs.clientId
