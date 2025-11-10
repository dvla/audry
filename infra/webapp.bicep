param botId string
param cosmosDbEndpoint string
param cosmosDbDatabase string
param cosmosDbContainer string
param cosmosDbAuthKey string
param docIntEndpoint string
param environmentName string
param geminiApiKey string
param identityId string
param appiInstrumentationKey string
param appiConnectionString string
param location string
param serverfarmName string
param storageAccountName string
param storageBlobContainer string
param tenantId string
param userAssignedIdentityPrincipalId string
param webAppName string
param webAppSKU string
param webAppConfigName string

var featureFlags = [
  {
    id: 'exconfig'
    description: 'Extended config for advanced features'
    enabled: false
  }
  // Add more feature flags as needed
]
var vFeatureFlags = [
  {
    id: 'ttsmodel'
    description: 'Controls the TTS model used by the bot'
    enabled: true
    variants: [
      {
        name: 'general'
        configuration_value: {
          provider: 'google'
          model: 'gemini-2.5-flash-preview-tts'
        }
      }
      {
        name: 'advanced'
        configuration_value: {
          provider: 'google'
          model: 'gemini-2.5-pro-preview-tts'
        }
      }
      {
        name: 'premium'
        configuration_value: {
          provider: 'elevenlabs'
          model: 'eleven_v3'
        }
      } 
    ]
    allocation: {
      percentile: [
        {
          variant: 'general'
          from: 0
          to: 100
        }
      ]
      default_when_enabled: 'general'
      default_when_disabled: 'general'
    }
  }
  // Add more variant feature flags as needed
]

// Compute resources for your Web App
resource appServicePlan 'Microsoft.Web/serverfarms@2024-11-01' = {
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
resource webApp 'Microsoft.Web/sites@2024-11-01' = {
  location: location
  name: webAppName
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: true
      healthCheckPath: '/health'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appiConnectionString
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appiInstrumentationKey
        }
        {
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'AZURE_APP_CONFIG_ENDPOINT'
          value: 'https://${webAppConfigName}.azconfig.io'
        }
        {
          name: 'BOT_APP_ID'
          value: identityId
        }
        {
          name: 'BOT_ID'
          value: botId
        }
        {
          name: 'AZURE_CLIENT_ID'
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
        {
          name: 'COSMOSDB_AUTH_KEY'
          value: cosmosDbAuthKey
        }
        {
          name: 'DOCINT_ENDPOINT'
          value: docIntEndpoint
        }
        {
          name: 'GEMINI_API_KEY'
          value: geminiApiKey
        }
        {
          name: 'LOG_LEVEL'
          value: 'info'
        }
        {
          name: 'RUNNING_ON_AZURE'
          value: '1'
        }
        {
          name: 'STORAGE_ACCOUNT_NAME'
          value: storageAccountName
        }
        {
          name: 'STORAGE_BLOB_CONTAINER_NAME'
          value: storageBlobContainer
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1' // Run Azure App Service from a package file
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22' // Set NodeJS version to 22.x for your site
        }


      ]
      ftpsState: 'FtpsOnly'
      linuxFxVersion: 'NODE|22-lts' // Set NodeJS version to 22.x for your site
    }
  }
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
}

// App Config for feature flags
resource webAppConfig 'Microsoft.AppConfiguration/configurationStores@2025-02-01-preview' = {
  name: webAppConfigName
  location: 'uksouth'
  sku: {
    name: 'Developer'
  }
  properties: {
    encryption: {}
    disableLocalAuth: false
    dataPlaneProxy: {
      authenticationMode: 'Pass-through'
      privateLinkDelegation: 'Disabled'
    }
    telemetry: {}
  }
}

resource Featureflag 'Microsoft.AppConfiguration/configurationStores/keyValues@2024-06-01' = [for featureFlag in featureFlags: {
  parent: webAppConfig
  name: '.appconfig.featureflag~2F${featureFlag.id}'
  properties: {
    value: string(
      {
        id: featureFlag.id
        description: featureFlag.description
        enabled: featureFlag.enabled
      }
  )
    contentType: 'application/vnd.microsoft.appconfig.ff+json;charset=utf-8'
  }
  dependsOn: [
    appConfigDeployRoleAssignment
  ]
}]

resource VariantFeatureflag 'Microsoft.AppConfiguration/configurationStores/keyValues@2024-06-01' = [for vFeatureFlag in vFeatureFlags: {
  parent: webAppConfig
  name: '.appconfig.featureflag~2F${vFeatureFlag.id}'
  properties: {
    value: string(
      {
        id: vFeatureFlag.id
        description: vFeatureFlag.description
        enabled: vFeatureFlag.enabled
        variants: vFeatureFlag.variants
        allocation: vFeatureFlag.allocation
      }
  )
    contentType: 'application/vnd.microsoft.appconfig.ff+json;charset=utf-8'
  }
  dependsOn: [
    appConfigDeployRoleAssignment
  ]
}]

// Assign the DevOps Service Connection Identity the App Configuration Data Owner role to the Web App Configuration
resource appConfigDeployRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('5ae67dd6-50cb-40e7-96ff-dc2bfa4b606b',userAssignedIdentityPrincipalId, webAppConfig.id)
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', '5ae67dd6-50cb-40e7-96ff-dc2bfa4b606b') // Role definition ID for App Configuration Data Owner
    principalId: '61585fae-6bdb-4f99-ae7b-5e0bf7b6b76f' // DevOps Service Connection Identity (uami-devops-deploy-svcconnection)
    principalType: 'ServicePrincipal'
  }
}
// Assign the User Assigned Identity Data Reader role to the Web App Configuration
resource appConfigRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('516239f1-63e1-4d78-a4de-a74fb236a071',userAssignedIdentityPrincipalId, webAppConfig.id)
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', '516239f1-63e1-4d78-a4de-a74fb236a071') // Role definition ID for App Configuration Data Reader
    principalId: userAssignedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output webAppId string = webApp.id
output defaultHostName string = webApp.properties.defaultHostName
