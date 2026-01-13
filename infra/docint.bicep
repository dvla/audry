param docIntName string
param location string
param userAssignedIdentityPrincipalId string
param docIntBaseName string
param skuName string

resource accounts_audry_docs_name_resource 'Microsoft.CognitiveServices/accounts@2025-09-01' = {
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
resource docintUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(accounts_audry_docs_name_resource.id, userAssignedIdentityPrincipalId, 'CogSvcUser')
  scope: accounts_audry_docs_name_resource
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908') // Role definition ID for Cognitive Service User
    principalId: userAssignedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Allow Gethin/Dan/Rohit local Bots to use the Cognitive Service
resource docintUserRoleAssignmentGethin 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(accounts_audry_docs_name_resource.id, 'a579abe6-b06c-44b3-9902-d706b4657460', 'CogSvcUser')
  scope: accounts_audry_docs_name_resource
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908') // Role definition ID for Cognitive Service User
    principalId: 'a579abe6-b06c-44b3-9902-d706b4657460' // Gethin's Service Principal ID
    principalType: 'ServicePrincipal'
  }
}
resource docintUserRoleAssignmentDan 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(accounts_audry_docs_name_resource.id, '14c7c432-693c-4cc5-a4de-f72de60adc88', 'CogSvcUser')
  scope: accounts_audry_docs_name_resource
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908') // Role definition ID for Cognitive Service User
    principalId: '14c7c432-693c-4cc5-a4de-f72de60adc88' // Dan's Service Principal ID
    principalType: 'ServicePrincipal'
  }
}
resource docintUserRoleAssignmentRohit 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(accounts_audry_docs_name_resource.id, 'a3c94286-6bab-4d0c-a867-f87d248a0b85', 'CogSvcUser')
  scope: accounts_audry_docs_name_resource
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908') // Role definition ID for Cognitive Service User
    principalId: 'a3c94286-6bab-4d0c-a867-f87d248a0b85' // Rohit's Service Principal ID
    principalType: 'ServicePrincipal'
  }
}

output docIntEndpoint string = accounts_audry_docs_name_resource.properties.endpoint
