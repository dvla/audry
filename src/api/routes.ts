import { zValidator } from '@hono/zod-validator'
import { Context, Hono } from 'hono'
import { stream } from 'hono/streaming'
import * as fs from 'node:fs'
import * as z from 'zod'

import { log } from '../internal/logger'
import { reviewTranscript } from '../internal/utils/graphUtils'
import { EpisodeConfig, EpisodeSchema } from '../tts/episodeConfig'
import { toTranscript, transcriptToAudioProvider } from '../tts/textToTranscript'

// All the POST APIs share the same input schema, made up of text string and optional config.
const requestSchema = z.object({
  text: z.string(),
  config: z.optional(EpisodeSchema),
})

/**
 * Stream the transcript as audio.
 * @param config The episode configuration.
 * @param transcript The transcript text.
 * @param c The Hono context.
 * @returns A streaming response.
 */
const transcriptAsAudio = async (config: EpisodeConfig, transcript: string, c: Context) => {
  const transcriptToAudio = await transcriptToAudioProvider(config)
  const { outputFileName, outputFilePath } = await transcriptToAudio(transcript)
  if (outputFilePath) {
    try {
      const fileBuffer = fs.readFileSync(outputFilePath)
      log.info(`Streaming audio file: ${outputFileName}`)
      return stream(c, async (stream) => {
        c.header('Content-Type', 'application/octet-stream')
        c.header('Content-Disposition', `attachment; filename="${outputFileName}"`)
        await stream.write(fileBuffer)
      })
    } catch (error) {
      log.error(`Error streaming audio file: ${outputFileName}`, error)
    }
  }
  return c.json('transcriptToAudio failed', 500)
}

/**
 * Process the incoming request.
 * @param c The Hono context.
 * @returns The processed request data.
 */
const processRequest = async (c: Context) => {
  log.debug('Processing ' + c.req.url)
  const body = await c.req.json()
  const config: EpisodeConfig = EpisodeSchema.parse(body.config || {})
  return { body, config }
}

/**
 * Define the API routes for the application.
 * @param app The Hono application instance.
 */
export const routes = (app: Hono) => {
  app.post('/api/texttotranscript', zValidator('json', requestSchema), async (c) => {
    const { body, config } = await processRequest(c)
    const transcript = await toTranscript(body.text, config)
    return c.text(transcript)
  })

  app.post('/api/transcripttoaudio', zValidator('json', requestSchema), async (c) => {
    const { body, config } = await processRequest(c)
    return await transcriptAsAudio(config, body.text, c)
  })

  app.post('/api/texttoaudio', zValidator('json', requestSchema), async (c) => {
    const { body, config } = await processRequest(c)
    const transcript = await toTranscript(body.text, config)
    return await transcriptAsAudio(config, transcript, c)
  })

  app.post('/api/reviewtranscript', zValidator('json', requestSchema), async (c) => {
    const { body } = await processRequest(c)
    const podcastId = 'API_ReviewTranscript_' + Date.now().toString()
    const review = await reviewTranscript(body.text, podcastId)

    return c.json({
      britishGrammarFeedback: review.bgFeedback,
      contentReviewerFeedback: review.crFeedback,
      expressiveDeliveryFeedback: review.edaFeedback,
      finalTranscript: review.finalTranscript,
    })
  })
}
