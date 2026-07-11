const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const serializeError = (error) => {
  if (!error) {
    return undefined;
  }

  return {
    name: error.name,
    message: error.message,
    stack: isProduction ? undefined : error.stack,
    code: error.code,
  };
};

const writeLog = (level, message, meta = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta && typeof meta === 'object' ? meta : {}),
  };

  const line = `${JSON.stringify(payload)}\n`;
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(line);
};

const logger = {
  info(message, meta) {
    writeLog('info', message, meta);
  },
  warn(message, meta) {
    writeLog('warn', message, meta);
  },
  error(message, error, meta = {}) {
    writeLog('error', message, {
      ...meta,
      error: serializeError(error),
    });
  },
};

module.exports = {
  logger,
};
