param botDisplayName string
param botServiceName string
param botServiceSku string = 'F0'
param identityResourceId string
param identityClientId string
param identityTenantId string
param botAppDomain string

// Register your web service as a bot with the Bot Framework
resource botService 'Microsoft.BotService/botServices@2022-09-15' = {
  kind: 'azurebot'
  location: 'global'
  name: botServiceName
  properties: {
    displayName: botDisplayName
    endpoint: 'https://${botAppDomain}/api/messages'
    msaAppId: identityClientId
    msaAppMSIResourceId: identityResourceId
    msaAppTenantId:identityTenantId
    msaAppType:'UserAssignedMSI'
  }
  sku: {
    name: botServiceSku
  }
}

// Connect the bot service to Microsoft Teams
resource botServiceMsTeamsChannel 'Microsoft.BotService/botServices/channels@2022-09-15' = {
  parent: botService
  location: 'global'
  name: 'MsTeamsChannel'
  properties: {
    channelName: 'MsTeamsChannel'
  }
}
