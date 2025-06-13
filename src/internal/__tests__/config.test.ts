import { Config } from '../../internal/config'
import { describe, expect, test, vi, beforeEach, afterAll } from 'vitest'

describe('config test', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('should handle environment variables', () => {
    // Setup
    delete process.env.BOT_ID
    delete process.env.BOT_TYPE
    delete process.env.BOT_TENANT_ID
    delete process.env.BOT_PASSWORD

    // Re-import to get fresh config with deleted env variables
    vi.resetModules()

    // Assert
    expect(Config.MicrosoftAppId).toBeUndefined()
    expect(Config.MicrosoftAppType).toBeUndefined()
    expect(Config.MicrosoftAppTenantId).toBeUndefined()
    expect(Config.MicrosoftAppPassword).toBeUndefined()

    expect(Config.ELEVENLABS_API_KEY).toBeUndefined()
    expect(Config.FILES_DIR).toBeDefined() // Should default to os.tmpdir()
    expect(Config.MAX_PAGES).toEqual(80) // Should default to 80 if not set
  })
})
