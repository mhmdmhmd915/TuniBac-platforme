const path = require('path');

const FILE_TYPE_RULES = {
  'application/pdf': {
    extensions: ['.pdf'],
    detect: (buffer) => buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-',
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    detect: (buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer.includes(Buffer.from('word/')) || buffer.includes(Buffer.from('[Content_Types].xml'))),
  },
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    detect: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  'image/png': {
    extensions: ['.png'],
    detect: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a,
  },
  'image/gif': {
    extensions: ['.gif'],
    detect: (buffer) => {
      const signature = buffer.subarray(0, 6).toString('ascii');
      return signature === 'GIF87a' || signature === 'GIF89a';
    },
  },
  'image/webp': {
    extensions: ['.webp'],
    detect: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  'video/mp4': {
    extensions: ['.mp4'],
    detect: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
      ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V ', 'MSNV'].includes(buffer.subarray(8, 12).toString('ascii')),
  },
  'video/quicktime': {
    extensions: ['.mov', '.qt'],
    detect: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
      buffer.subarray(8, 12).toString('ascii') === 'qt  ',
  },
};

const normalizeMimeType = (value) => String(value || '').trim().toLowerCase();
const normalizeExtension = (filename) => path.extname(String(filename || '').trim()).toLowerCase();

const getRuleForMimeType = (mimeType) => FILE_TYPE_RULES[normalizeMimeType(mimeType)] || null;

const isAllowedExtensionForMimeType = (filename, mimeType) => {
  const rule = getRuleForMimeType(mimeType);
  if (!rule) return false;
  return rule.extensions.includes(normalizeExtension(filename));
};

const validateRequestedUpload = ({ filename, contentType, sizeBytes, allowedMimeTypes, maxSizeBytes }) => {
  const mimeType = normalizeMimeType(contentType);
  const parsedSize = Number(sizeBytes || 0);

  if (!allowedMimeTypes.includes(mimeType)) {
    return 'Invalid file type';
  }

  if (!isAllowedExtensionForMimeType(filename, mimeType)) {
    return 'Invalid file extension';
  }

  if (!Number.isFinite(parsedSize) || parsedSize <= 0 || parsedSize > maxSizeBytes) {
    return 'File too large';
  }

  return null;
};

const validateFileBuffer = ({ buffer, filename, mimeType, allowedMimeTypes, maxSizeBytes }) => {
  const normalizedMimeType = normalizeMimeType(mimeType);
  const parsedSize = Buffer.isBuffer(buffer) ? buffer.length : 0;

  if (!allowedMimeTypes.includes(normalizedMimeType)) {
    return 'Invalid file type';
  }

  if (!isAllowedExtensionForMimeType(filename, normalizedMimeType)) {
    return 'Invalid file extension';
  }

  if (!parsedSize || parsedSize > maxSizeBytes) {
    return 'File too large';
  }

  const rule = getRuleForMimeType(normalizedMimeType);
  if (!rule || !rule.detect(buffer)) {
    return 'File signature does not match the declared file type';
  }

  return null;
};

module.exports = {
  FILE_TYPE_RULES,
  getRuleForMimeType,
  isAllowedExtensionForMimeType,
  normalizeMimeType,
  validateRequestedUpload,
  validateFileBuffer,
};
