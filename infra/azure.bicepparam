using 'azure.bicep'

param botDisplayName = readEnvironmentVariable('BOT_DISPLAY_NAME')
param environmentName = readEnvironmentVariable('ENV_NAME')
param geminiApiKey = readEnvironmentVariable('GEMINI_KEY')
param location = readEnvironmentVariable('LOCATION')
param resourceBaseName = readEnvironmentVariable('RESOURCE_BASE_NAME')
param tenantId = readEnvironmentVariable('TENANT_ID')
param webAppSKU = readEnvironmentVariable('WEB_APP_SKU')
