import os from 'os'
import path from 'path'

// Environment variable placeholder
export const ENV_PLACEHOLDER = '<not_set>'
export const DEFAULT_EMPTY = ''

// Default values for environment variables
export const DEFAULT_FILES_DIR = os.tmpdir()
export const DEFAULT_AUDIO_FILES_DIR = path.join(__dirname, '../audio')
export const DEFAULT_LOG_LEVEL = 'info'
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash-001'
export const DEFAULT_GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts'
export const DEFAULT_MAX_NUMBER_OF_LINES = '28'
export const DEFAULT_LINES_PER_CHUNK = '28'
export const DEFAULT_ORG = 'DVLA (Driver and Vehicle Licensing Agency)'
export const DEFAULT_SITE_NAME = 'dev'

/**
 * Checks if a variable is set and not equal to the placeholder.
 * If it is not set or equal to the placeholder, returns the default value.
 * @param variable environment variable to check
 * @param defaultValue default value to return if the variable is not set or is equal to the placeholder
 * @returns environment variable value or default values
 */
const checkOptionalVariable = (variable: string | undefined, defaultValue: string): string => {
  if (variable && variable.trim() !== '' && variable.trim() !== ENV_PLACEHOLDER) {
    return variable
  }
  return defaultValue
}

export const Config = {
  MicrosoftAppId: process.env.BOT_ID,
  MicrosoftAppType: process.env.BOT_TYPE,
  MicrosoftAppTenantId: process.env.BOT_TENANT_ID,
  MicrosoftAppPassword: process.env.BOT_PASSWORD,

  LOG_LEVEL: checkOptionalVariable(process.env.LOG_LEVEL, DEFAULT_LOG_LEVEL).toLowerCase(),
  // ElevenLabs API Key
  ELEVENLABS_API_KEY: checkOptionalVariable(process.env.ELEVENLABS_API_KEY, DEFAULT_EMPTY),
  // Audry Temporary Files Directory
  FILES_DIR: checkOptionalVariable(process.env.AUDRY_FILES_DIR, DEFAULT_FILES_DIR),
  AUDIO_FILES_DIR: checkOptionalVariable(process.env.AUDRY_AUDIO_FILES_DIR, DEFAULT_AUDIO_FILES_DIR),
  //Gemini API Key
  GEMINI_API_KEY: checkOptionalVariable(process.env.GEMINI_API_KEY, DEFAULT_EMPTY),
  //Gemini Model
  GEMINI_MODEL: checkOptionalVariable(process.env.GEMINI_MODEL, DEFAULT_GEMINI_MODEL),
  // Max number of lines for transcript chunks
  MAX_NUMBER_OF_LINES: checkOptionalVariable(process.env.MAX_NUMBER_OF_LINES, DEFAULT_MAX_NUMBER_OF_LINES),
  // Number of lines per chunk for transcript processing
  LINES_PER_CHUNK: checkOptionalVariable(process.env.LINES_PER_CHUNK, DEFAULT_LINES_PER_CHUNK),

  COSMOSDB_ENDPOINT: checkOptionalVariable(process.env.COSMOSDB_ENDPOINT, DEFAULT_EMPTY),
  COSMOSDB_DATABASE: checkOptionalVariable(process.env.COSMOSDB_DATABASE, DEFAULT_EMPTY),
  COSMOSDB_CONTAINER: checkOptionalVariable(process.env.COSMOSDB_CONTAINER, DEFAULT_EMPTY),
  COSMOSDB_AUTH_KEY: checkOptionalVariable(process.env.COSMOSDB_AUTH_KEY, DEFAULT_EMPTY),
  DOCINT_ENDPOINT: checkOptionalVariable(process.env.DOCINT_ENDPOINT, DEFAULT_EMPTY),

  APP_CONFIG_ENDPOINT: checkOptionalVariable(process.env.AZURE_APP_CONFIG_ENDPOINT, DEFAULT_EMPTY),
  // Azure Blob Storage configuration
  STORAGE_ACCOUNT_NAME: checkOptionalVariable(process.env.STORAGE_ACCOUNT_NAME, DEFAULT_EMPTY),
  STORAGE_BLOB_CONTAINER_NAME: checkOptionalVariable(process.env.STORAGE_BLOB_CONTAINER_NAME, DEFAULT_EMPTY),
  ORGANISATION_NAME: checkOptionalVariable(process.env.ORGANIZATION_NAME, DEFAULT_ORG),

  WEBSITE_SITE_NAME: checkOptionalVariable(process.env.WEBSITE_SITE_NAME, DEFAULT_SITE_NAME),
}
