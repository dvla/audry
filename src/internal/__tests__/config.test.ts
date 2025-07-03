import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  DEFAULT_EMPTY,
  DEFAULT_FILES_DIR,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_MAX_PAGES,
  ENV_PLACEHOLDER,
} from '../../internal/config'

describe('config test', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('should return default for optional if not set', async () => {
    // Setup
    delete process.env.BOT_ID
    delete process.env.BOT_TYPE
    delete process.env.BOT_TENANT_ID
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.AUDRY_FILES_DIR
    delete process.env.AUDRY_MAX_PAGES
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL

    // Re-import to get fresh config with deleted env variables
    vi.resetModules()
    const { Config } = await import('../../internal/config.js')

    // Assert
    expect(Config.MicrosoftAppId).toBeUndefined()
    expect(Config.MicrosoftAppType).toBeUndefined()
    expect(Config.MicrosoftAppTenantId).toBeUndefined()
    expect(Config.ELEVENLABS_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.FILES_DIR).toEqual(DEFAULT_FILES_DIR)
    expect(Config.MAX_PAGES).toEqual(DEFAULT_MAX_PAGES)
    expect(Config.GEMINI_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.GEMINI_MODEL).toEqual(DEFAULT_GEMINI_MODEL)
  })

  test('should return environment variable if set', async () => {
    // Setup
    process.env.BOT_ID = 'test-bot-id'
    process.env.BOT_TYPE = 'test-bot-type'
    process.env.BOT_TENANT_ID = 'test-bot-tenant-id'
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-api-key'
    process.env.AUDRY_FILES_DIR = '/custom/files/dir'
    process.env.AUDRY_MAX_PAGES = '100'
    process.env.GEMINI_API_KEY = 'test-gemini-api-key'
    process.env.GEMINI_MODEL = 'gemini-2.0-flash-001'

    // Re-import to get fresh config with set env variables
    vi.resetModules()
    const { Config } = await import('../../internal/config.js')

    // Assert
    expect(Config.MicrosoftAppId).toEqual('test-bot-id')
    expect(Config.MicrosoftAppType).toEqual('test-bot-type')
    expect(Config.MicrosoftAppTenantId).toEqual('test-bot-tenant-id')
    expect(Config.ELEVENLABS_API_KEY).toEqual('test-elevenlabs-api-key')
    expect(Config.FILES_DIR).toEqual('/custom/files/dir')
    expect(Config.MAX_PAGES).toEqual('100')
    expect(Config.GEMINI_API_KEY).toEqual('test-gemini-api-key')
    expect(Config.GEMINI_MODEL).toEqual('gemini-2.0-flash-001')
  })

  test('should return default values for optional variables with a placeholder', async () => {
    // Setup
    process.env.ELEVENLABS_API_KEY = ENV_PLACEHOLDER
    process.env.AUDRY_FILES_DIR = ENV_PLACEHOLDER
    process.env.AUDRY_MAX_PAGES = ENV_PLACEHOLDER
    process.env.GEMINI_API_KEY = ENV_PLACEHOLDER
    process.env.GEMINI_MODEL = ENV_PLACEHOLDER

    // Re-import to get fresh config with deleted env variables
    vi.resetModules()
    const { Config } = await import('../../internal/config.js')

    // Assert
    expect(Config.ELEVENLABS_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.FILES_DIR).toEqual(DEFAULT_FILES_DIR)
    expect(Config.MAX_PAGES).toEqual(DEFAULT_MAX_PAGES)
    expect(Config.GEMINI_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.GEMINI_MODEL).toEqual(DEFAULT_GEMINI_MODEL)
  })

  test('should return default values for optional variables that are empty', async () => {
    // Setup
    process.env.ELEVENLABS_API_KEY = ''
    process.env.AUDRY_FILES_DIR = ''
    process.env.AUDRY_MAX_PAGES = ''
    process.env.GEMINI_API_KEY = ''
    process.env.GEMINI_MODEL = ''

    // Re-import to get fresh config with deleted env variables
    vi.resetModules()
    const { Config } = await import('../../internal/config.js')

    // Assert
    expect(Config.ELEVENLABS_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.FILES_DIR).toEqual(DEFAULT_FILES_DIR)
    expect(Config.MAX_PAGES).toEqual(DEFAULT_MAX_PAGES)
    expect(Config.GEMINI_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.GEMINI_MODEL).toEqual(DEFAULT_GEMINI_MODEL)
  })
})
