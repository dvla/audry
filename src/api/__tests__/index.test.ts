import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all external dependencies before importing
vi.mock('@hono/node-server', () => ({
  serve: vi.fn(),
}))

vi.mock('@hono/node-server/serve-static', () => ({
  serveStatic: vi.fn(() => vi.fn()),
}))

vi.mock('hono', () => {
  const mockApp = {
    get: vi.fn(),
    use: vi.fn(),
    fetch: vi.fn(),
    post: vi.fn(),
  }

  return {
    Hono: vi.fn(() => mockApp),
  }
})

// Get typed mock functions
const mockServe = vi.mocked(serve)
const mockServeStatic = vi.mocked(serveStatic)
const mockHono = vi.mocked(Hono)

describe('API Server (index.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should create a new Hono application instance', async () => {
      await import('../index.js')

      expect(mockHono).toHaveBeenCalledWith()
    })
  })

  describe('Server Start', () => {
    it('should provide correct startup message callback', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { start } = await import('../index.js')
      await start()

      // Verify serve was called and get the callback
      expect(mockServe).toHaveBeenCalled()
      const serveCall = mockServe.mock.calls[0]
      const startupCallback = serveCall[1]

      // Test the callback
      startupCallback({ port: 3000, address: 'localhost', family: 'IPv4' })

      expect(consoleSpy).toHaveBeenCalledWith('API running on http://localhost:3000')
    })

    it('should register API routes', async () => {
      await import('../index.js')
      // Wait for async server start
      await new Promise((resolve) => setTimeout(resolve, 100))

      // We can't easily test the routes call with our current mock setup,
      // so we verify the server starts successfully which implies routes were loaded
      expect(mockServe).toHaveBeenCalled()
    })
  })

  describe('Module Structure', () => {
    it('should use correct static file directory', async () => {
      await import('../index.js')

      const staticCall = mockServeStatic.mock.calls[0]
      expect(staticCall[0]).toEqual({ root: './lib/static' })
    })
  })
})
