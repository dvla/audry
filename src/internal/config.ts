import os from 'os'

// Environment variable placeholder
export const ENV_PLACEHOLDER = '<not_set>'

// Default values for environment variables
export const DEFAULT_ELEVENLABS_API_KEY = ''
export const DEFAULT_FILES_DIR = os.tmpdir()
export const DEFAULT_MAX_PAGES = '80'
export const DEFAULT_GEMINI_API_KEY = ''
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash-001'

/**
 * Checks if a variable is set and not equal to the placeholder.
 * If it is not set or equal to the placeholder, returns the default value.
 * @param variable environment variable to check
 * @param defaultValue default value to return if the variable is not set or is equal to the placeholder
 * @returns environment variable value or default value
 */
const checkOptionalVariable = (variable: string, defaultValue: string) => {
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
  // ElevenLabs API Key
  ELEVENLABS_API_KEY: checkOptionalVariable(process.env.ELEVENLABS_API_KEY, DEFAULT_ELEVENLABS_API_KEY),
  // Audry Temporary Files Directory
  FILES_DIR: checkOptionalVariable(process.env.AUDRY_FILES_DIR, DEFAULT_FILES_DIR),
  // Audry PDF max pages to process
  MAX_PAGES: checkOptionalVariable(process.env.AUDRY_MAX_PAGES, DEFAULT_MAX_PAGES),
  //Gemini API Key
  GEMINI_API_KEY: checkOptionalVariable(process.env.GEMINI_API_KEY, DEFAULT_GEMINI_API_KEY),
  //Gemini Model
  GEMINI_MODEL: checkOptionalVariable(process.env.GEMINI_MODEL, DEFAULT_GEMINI_MODEL),
}
