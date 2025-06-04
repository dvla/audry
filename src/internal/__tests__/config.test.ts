import config from '../config'

describe('config test', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('should handle undefined environment variables', () => {
    // Setup
    delete process.env.BOT_ID
    delete process.env.BOT_TYPE
    delete process.env.BOT_TENANT_ID
    delete process.env.BOT_PASSWORD

    // Re-import to get fresh config with deleted env variables
    jest.resetModules()

    // Assert
    expect(config.MicrosoftAppId).toBeUndefined()
    expect(config.MicrosoftAppType).toBeUndefined()
    expect(config.MicrosoftAppTenantId).toBeUndefined()
    expect(config.MicrosoftAppPassword).toBeUndefined()
  })
})
