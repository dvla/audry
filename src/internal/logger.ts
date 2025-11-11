import { AzureMonitorOpenTelemetryOptions, useAzureMonitor } from '@azure/monitor-opentelemetry'
import { createAzureSdkInstrumentation } from '@azure/opentelemetry-instrumentation-azure-sdk'
import { metrics, trace } from '@opentelemetry/api'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { createLogger, format, transports } from 'winston'

import { Config } from './config'

export const SERVICE_NAME = Config.WEBSITE_SITE_NAME

// Initialize OpenTelemetry only if Application Insights connection string is provided
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  const resource = {
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
  }
  const exporter = new ConsoleSpanExporter()
  const processor = new BatchSpanProcessor(exporter)
  const options: AzureMonitorOpenTelemetryOptions = {
    instrumentationOptions: {
      http: { enabled: true },
      azureSdk: { enabled: true },
      winston: { enabled: false },
    },
    azureMonitorExporterOptions: {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    },
    resource: resourceFromAttributes(resource),
    spanProcessors: [processor],
  }
  useAzureMonitor(options)
  registerInstrumentations({
    tracerProvider: trace.getTracerProvider(),
    meterProvider: metrics.getMeterProvider(),
    instrumentations: [createAzureSdkInstrumentation()],
  })
}

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
  isDebugEnabled: () => boolean
}

const logger = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
  ? createLogger({
      transports: [
        new transports.Console({
          level: Config.LOG_LEVEL,
        }),
      ],
      exitOnError: false,
    })
  : createLogger({
      transports: [
        new transports.Console({
          format: format.simple(),
          level: 'debug',
        }),
      ],
      exitOnError: false,
    })

logger.transports.forEach((transport, idx) => {
  logger.warn(
    `Transport[${idx}] cname: ${transport.constructor.name ?? 'undefined'} level: ${transport.level ?? 'undefined'}`
  )
})

let secondLogger = logger.transports[1]
if (secondLogger) {
  logger.warn(`Second transport changing level from: ${secondLogger.level ?? 'undefined'} to ${Config.LOG_LEVEL}`)
  secondLogger.level = Config.LOG_LEVEL
}

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
  isDebugEnabled: () => logger.isDebugEnabled(),
})

/**
 * Global logger instance for the application.
 */
export const log = getLogger()
