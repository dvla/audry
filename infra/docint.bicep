param docIntName string
param location string
param userAssignedIdentityPrincipalId string
param docIntBaseName string
param skuName string

resource accounts_audry_docs_name_resource 'Microsoft.CognitiveServices/accounts@2025-04-01-preview' = {
  name: docIntName
  location: location
  sku: {
    name: skuName
  }
  kind: 'FormRecognizer'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    customSubDomainName: docIntBaseName
    networkAcls: {
      defaultAction: 'Allow'
      virtualNetworkRules: []
      ipRules: []
    }
    allowProjectManagement: false
    publicNetworkAccess: 'Enabled'
  }
}

// Allow Bot Managed Identity to use the Cognitive Service
resource docintUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2020-04-01-preview' = {
  name: guid(accounts_audry_docs_name_resource.id, userAssignedIdentityPrincipalId, 'appinsightsPublisher')
  scope: accounts_audry_docs_name_resource
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908') // Role definition ID for Cognitive Service User
    principalId: userAssignedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

output docIntEndpoint string = accounts_audry_docs_name_resource.properties.endpoint
