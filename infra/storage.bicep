param storageAccountName string
param location string = resourceGroup().location
param containerName string
param userAssignedIdentityPrincipalId string

resource storageAccount 'Microsoft.Storage/storageAccounts@2025-01-01' = {
  name: storageAccountName
  location: location
  
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  name: '${storageAccount.name}/default/${containerName}'
  properties: {
    publicAccess: 'None'
  }
}

resource storageBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, userAssignedIdentityPrincipalId, 'storageBlobContributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe') // Role definition ID for Storage Blob Data Contributor
    principalId: userAssignedIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2025-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    lastAccessTimeTrackingPolicy: {
      enable: true
      name: 'AccessTimeTracking'
      trackingGranularityInDays: 1
      blobType: [
        'blockBlob'
      ]
    }
    cors: {
      corsRules: []
    }
    deleteRetentionPolicy: {
      allowPermanentDelete: false
      enabled: true
      days: 3
    }
  }
}

resource storageMgmtPolicy 'Microsoft.Storage/storageAccounts/managementPolicies@2025-01-01' = {
  name: 'default'
  dependsOn: [
    blobService
  ]
  parent: storageAccount
  properties: {
    policy: {
      rules: [
        {
          enabled: true
          name: 'MoveToCoolAfter3Days'
          type: 'Lifecycle'
          definition: {
            actions: {
              baseBlob: {
                tierToCool: {
                  daysAfterModificationGreaterThan: 3
                }
              }
            }
            filters: {
              blobTypes: ['blockBlob']
            }
          }
        }
        {
          enabled: true
          name: 'DeleteAfter30Days'
          type: 'Lifecycle'
          definition: {
            actions: {
              baseBlob: {
                delete: {
                  daysAfterLastAccessTimeGreaterThan: 30
                }
              }
            }
            filters: {
              blobTypes: ['blockBlob']
            }
          }
        }
      ]
    }
  }
}

output storageAccountName string = storageAccount.name
output blobContainerName string = containerName
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob
