const path = require('path');
const { inspectObject, normalizeStoredFileValueToKey } = require('../lib/r2');
const { validateFileBuffer, normalizeMimeType } = require('./fileSecurity');

const validateStoredUpload = async ({
  storedValue,
  allowedMimeTypes,
  maxSizeBytes,
  expectedMimeType,
  originalFilename,
}) => {
  const key = normalizeStoredFileValueToKey(storedValue);
  if (!key || /^https?:\/\//i.test(String(key))) {
    return;
  }

  const inspected = await inspectObject({ key });
  const effectiveMimeType = normalizeMimeType(expectedMimeType || inspected.contentType);
  const filename = originalFilename || path.basename(key);

  const validationError = validateFileBuffer({
    buffer: inspected.sample,
    filename,
    mimeType: effectiveMimeType,
    allowedMimeTypes,
    maxSizeBytes,
  });

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  if (inspected.contentLength <= 0 || inspected.contentLength > maxSizeBytes) {
    const error = new Error('Stored file exceeds the allowed size');
    error.statusCode = 400;
    throw error;
  }
};

module.exports = {
  validateStoredUpload,
};
