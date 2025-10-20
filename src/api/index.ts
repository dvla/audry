import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { config } from 'dotenv'
import { Hono } from 'hono'

config({ path: 'env/.env.local' })

const app = new Hono()
app.get('/', (c) => c.text('Api server is running.'))
app.use('*', serveStatic({ root: './lib/static' }))
/**
 * Start the API server
 * The config needs to be loaded before starting the server, so this
 * work around does this.
 */
export const start = async () => {
  const { Config } = await import('../internal/config.js')
  // Reset the Config object properties so this API can be used without Azure
  Config.APP_CONFIG_ENDPOINT = ''
  Config.COSMOSDB_ENDPOINT = ''

  const { routes } = await import('./routes.js')
  routes(app)
  serve(
    {
      fetch: app.fetch,
      port: 3000,
    },
    (info) => {
      console.log(`API running on http://localhost:${info.port}, try /start.html`)
    }
  )
}
;(async () => {
  await start()
})()
