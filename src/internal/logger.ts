import { createLogger, format, transports } from 'winston'

import { Config } from './config'

/**
 * Interface representing a generic logger with various log levels.
 *
 * @remarks
 * Provides methods for logging messages at different severity levels:
 * `debug`, `info`, `warn`, and `error`.
 *
 * @interface
 */
interface Logger {
  debug: (message: string) => void
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string, error?: Error) => void
}

const logger = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
  ? createLogger({
      transports: [
        new transports.Console({
          level: Config.LOG_LEVEL,
        }),
      ],
    })
  : createLogger({
      transports: [
        new transports.Console({
          format: format.simple(),
          level: 'debug',
        }),
      ],
    })

logger.warn('Logging level set to ' + logger.transports[0].level)
/**
 * Returns a logger instance that provides methods for logging messages at various levels
 * (debug, info, warn, error). Each method delegates to the underlying `logger` implementation.
 *
 * @returns {Logger} An object with logging methods: `debug`, `info`, `warn`, and `error`.
 */
const getLogger = (): Logger => ({
  debug: (message) => logger.debug(message),
  info: (message) => logger.info(message),
  warn: (message) => logger.warn(message),
  error: (message, error) => logger.error(message, error),
})

/**
 * Global logger instance for the application.
 */
export const log = getLogger()
