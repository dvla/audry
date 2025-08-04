import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  DEFAULT_EMPTY,
  DEFAULT_FILES_DIR,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_TTS_MODEL,
  DEFAULT_LINES_PER_CHUNK,
  DEFAULT_MAX_NUMBER_OF_LINES,
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
    delete process.env.ELEVENLABS_API_KEY
    delete process.env.AUDRY_FILES_DIR
    delete process.env.AUDRY_MAX_PAGES
    delete process.env.GEMINI_API_KEY
    delete process.env.GEMINI_MODEL
    delete process.env.COSMOSDB_ENDPOINT
    delete process.env.COSMOSDB_DATABASE
    delete process.env.COSMOSDB_CONTAINER
    delete process.env.MAX_NUMBER_OF_LINES
    delete process.env.LINES_PER_CHUNK

    // Re-import to get fresh config with deleted env variables
    vi.resetModules()
    const { Config } = await import('../../internal/config.js')

    // Assert
    expect(Config.ELEVENLABS_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.FILES_DIR).toEqual(DEFAULT_FILES_DIR)
    expect(Config.GEMINI_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.GEMINI_MODEL).toEqual(DEFAULT_GEMINI_MODEL)
    expect(Config.COSMOSDB_ENDPOINT).toEqual(DEFAULT_EMPTY)
    expect(Config.COSMOSDB_DATABASE).toEqual(DEFAULT_EMPTY)
    expect(Config.COSMOSDB_CONTAINER).toEqual(DEFAULT_EMPTY)
    expect(Config.MAX_NUMBER_OF_LINES).toEqual(DEFAULT_MAX_NUMBER_OF_LINES)
    expect(Config.LINES_PER_CHUNK).toEqual(DEFAULT_LINES_PER_CHUNK)
  })

  test('should return environment variable if set', async () => {
    // Setup
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-api-key'
    process.env.AUDRY_FILES_DIR = '/custom/files/dir'
    process.env.GEMINI_API_KEY = 'test-gemini-api-key'
    process.env.GEMINI_MODEL = 'gemini-2.0-flash-001'
    process.env.COSMOSDB_ENDPOINT = 'https://test-cosmosdb.documents.azure.com:443/'
    process.env.COSMOSDB_DATABASE = 'test-database'
    process.env.COSMOSDB_CONTAINER = 'test-container'
    process.env.MAX_NUMBER_OF_LINES = '28'
    process.env.LINES_PER_CHUNK = '4'

    // Re-import to get fresh config with set env variables
    vi.resetModules()
    const { Config } = await import('../../internal/config.js')

    // Assert
    expect(Config.ELEVENLABS_API_KEY).toEqual('test-elevenlabs-api-key')
    expect(Config.FILES_DIR).toEqual('/custom/files/dir')
    expect(Config.GEMINI_API_KEY).toEqual('test-gemini-api-key')
    expect(Config.GEMINI_MODEL).toEqual('gemini-2.0-flash-001')
    expect(Config.COSMOSDB_ENDPOINT).toEqual('https://test-cosmosdb.documents.azure.com:443/')
    expect(Config.COSMOSDB_DATABASE).toEqual('test-database')
    expect(Config.COSMOSDB_CONTAINER).toEqual('test-container')
    expect(Config.MAX_NUMBER_OF_LINES).toEqual('28')
    expect(Config.LINES_PER_CHUNK).toEqual('4')
  })

  test('should return default values for optional variables with a placeholder', async () => {
    // Setup
    process.env.ELEVENLABS_API_KEY = ENV_PLACEHOLDER
    process.env.AUDRY_FILES_DIR = ENV_PLACEHOLDER
    process.env.GEMINI_API_KEY = ENV_PLACEHOLDER
    process.env.GEMINI_MODEL = ENV_PLACEHOLDER
    process.env.COSMOSDB_ENDPOINT = ENV_PLACEHOLDER
    process.env.COSMOSDB_DATABASE = ENV_PLACEHOLDER
    process.env.COSMOSDB_CONTAINER = ENV_PLACEHOLDER
    process.env.MAX_NUMBER_OF_LINES = ENV_PLACEHOLDER
    process.env.LINES_PER_CHUNK = ENV_PLACEHOLDER

    // Re-import to get fresh config with deleted env variables
    vi.resetModules()
    const { Config } = await import('../../internal/config.js')

    // Assert
    expect(Config.ELEVENLABS_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.FILES_DIR).toEqual(DEFAULT_FILES_DIR)
    expect(Config.GEMINI_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.GEMINI_MODEL).toEqual(DEFAULT_GEMINI_MODEL)
    expect(Config.COSMOSDB_ENDPOINT).toEqual(DEFAULT_EMPTY)
    expect(Config.COSMOSDB_DATABASE).toEqual(DEFAULT_EMPTY)
    expect(Config.COSMOSDB_CONTAINER).toEqual(DEFAULT_EMPTY)
    expect(Config.MAX_NUMBER_OF_LINES).toEqual(DEFAULT_MAX_NUMBER_OF_LINES)
    expect(Config.LINES_PER_CHUNK).toEqual(DEFAULT_LINES_PER_CHUNK)
  })

  test('should return default values for optional variables that are empty', async () => {
    // Setup
    process.env.ELEVENLABS_API_KEY = ''
    process.env.AUDRY_FILES_DIR = ''
    process.env.GEMINI_API_KEY = ''
    process.env.GEMINI_MODEL = ''
    process.env.COSMOSDB_ENDPOINT = ''
    process.env.COSMOSDB_DATABASE = ''
    process.env.COSMOSDB_CONTAINER = ''
    process.env.MAX_NUMBER_OF_LINES = ''
    process.env.LINES_PER_CHUNK = ''

    // Re-import to get fresh config with deleted env variables
    vi.resetModules()
    const { Config } = await import('../../internal/config.js')

    // Assert
    expect(Config.ELEVENLABS_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.FILES_DIR).toEqual(DEFAULT_FILES_DIR)
    expect(Config.GEMINI_API_KEY).toEqual(DEFAULT_EMPTY)
    expect(Config.GEMINI_MODEL).toEqual(DEFAULT_GEMINI_MODEL)
    expect(Config.COSMOSDB_ENDPOINT).toEqual(DEFAULT_EMPTY)
    expect(Config.COSMOSDB_DATABASE).toEqual(DEFAULT_EMPTY)
    expect(Config.COSMOSDB_CONTAINER).toEqual(DEFAULT_EMPTY)
    expect(Config.MAX_NUMBER_OF_LINES).toEqual(DEFAULT_MAX_NUMBER_OF_LINES)
    expect(Config.LINES_PER_CHUNK).toEqual(DEFAULT_LINES_PER_CHUNK)
  })
})
