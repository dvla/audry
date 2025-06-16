import os from 'os'

export const Config = {
  MicrosoftAppId: process.env.BOT_ID,
  MicrosoftAppType: process.env.BOT_TYPE,
  MicrosoftAppTenantId: process.env.BOT_TENANT_ID,
  MicrosoftAppPassword: process.env.BOT_PASSWORD,

  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,

  // AUDRY specific configuration below
  FILES_DIR: process.env.AUDRY_FILES_DIR ?? os.tmpdir(),
  // Default to 80 pages if not set
  MAX_PAGES: process.env.AUDRY_MAX_PAGES ?? 80,
  //Gemini API Key
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  //Gemini Model
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-001',
}
