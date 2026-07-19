const isProduction =
  (process.env.NODE_ENV || 'development') === 'production' ||
  String(process.env.RENDER || '').toLowerCase() === 'true';

const getErrorMessage = (error, fallbackMessage = 'Internal server error') => {
  if (!error) {
    return fallbackMessage;
  }

  if (!isProduction && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

const sendError = (res, statusCode, publicMessage, error) => {
  res.status(statusCode).json({
    message: publicMessage,
    ...(isProduction ? {} : { error: getErrorMessage(error, publicMessage) }),
  });
};

module.exports = {
  isProduction,
  getErrorMessage,
  sendError,
};
