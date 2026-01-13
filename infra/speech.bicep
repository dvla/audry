param speechName string
param location string = resourceGroup().location

resource speech_name_resource 'Microsoft.CognitiveServices/accounts@2025-09-01' = {
  name: speechName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'SpeechServices'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    allowProjectManagement: false
    publicNetworkAccess: 'Enabled'
  }
}

output speechEndpoint string = speech_name_resource.properties.endpoint
output speechKey string = speech_name_resource.listKeys().key1
