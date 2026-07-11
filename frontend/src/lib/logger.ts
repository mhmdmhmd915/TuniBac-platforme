const isProduction = import.meta.env.PROD

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    }
  }

  return error
}

const write = (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta || {}),
  }

  if (!isProduction) {
    console[level](payload)
    return
  }

  console.log(payload)
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    write('info', message, meta)
  },
  warn(message: string, meta?: Record<string, unknown>) {
    write('warn', message, meta)
  },
  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    write('error', message, {
      ...(meta || {}),
      error: normalizeError(error),
    })
  },
}
