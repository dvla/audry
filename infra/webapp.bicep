param botId string
param cosmosDbEndpoint string
param cosmosDbDatabase string
param cosmosDbContainer string
param identityId string
param appiInstrumentationKey string
param appiConnectionString string
param location string
param serverfarmName string
param tenantId string
param webAppName string
param webAppSKU string

// Compute resources for your Web App
resource appServicePlan 'Microsoft.Web/serverfarms@2021-02-01' = {
  kind: 'app,linux'
  location: location
  name: serverfarmName
  properties: {
    reserved: true // Indicates that the App Service Plan is for Linux
  }
  sku: {
    name: webAppSKU
  }
}

// Web App that hosts your bot
resource webApp 'Microsoft.Web/sites@2021-02-01' = {
  //kind: 'app'
  location: location
  name: webAppName
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      appSettings: [
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1' // Run Azure App Service from a package file
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22' // Set NodeJS version to 22.x for your site
        }
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
        {
          name: 'BOT_ID'
          value: botId
        }
        {
          name: 'BOT_TENANT_ID'
          value: tenantId
        }
        {
          name: 'BOT_TYPE'
          value: 'UserAssignedMsi'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appiConnectionString
        }
        {
          name: 'APPLICATIONINSIGHTS_INSTRUMENTATIONKEY'
          value: appiInstrumentationKey
        }
        {
          name: 'COSMOSDB_ENDPOINT'
          value: cosmosDbEndpoint
        }
        {
          name: 'COSMOSDB_DATABASE'
          value: cosmosDbDatabase
        }
        {
          name: 'COSMOSDB_CONTAINER'
          value: cosmosDbContainer
        }
      ]
      ftpsState: 'FtpsOnly'
      linuxFxVersion: 'NODE|22' // Set NodeJS version to 22.x for your site
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
}

output webAppId string = webApp.id
output defaultHostName string = webApp.properties.defaultHostName
