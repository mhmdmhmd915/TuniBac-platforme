const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { putObject, toPublicUrlFromKey } = require('../lib/r2');
const { validateFileBuffer } = require('./fileSecurity');

const MIME_EXTENSION_MAP = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

const sanitizeRelativeDir = (relativeDir) =>
  relativeDir
    .split(/[\\/]+/)
    .filter(Boolean)
    .join('/');

const createSafeFilename = (file) => {
  const extension =
    MIME_EXTENSION_MAP[file.mimetype] || path.extname(file.originalname || '').toLowerCase() || '';
  return `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${extension}`;
};

const createUploadMiddleware = ({
  relativeDir,
  allowedMimeTypes,
  maxSizeBytes = 20 * 1024 * 1024,
  uploadToR2 = true,
}) => {
  const safeRelativeDir = sanitizeRelativeDir(relativeDir);
  const uploader = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSizeBytes,
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      const mimeType = String(file.mimetype || '').toLowerCase();

      if (allowedMimeTypes.includes(mimeType)) {
        cb(null, true);
        return;
      }

      cb(new Error('Invalid file type'));
    },
  });

  const wrap = (mw) => (req, res, next) => {
    mw(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file) return next();

      try {
        const validationError = validateFileBuffer({
          buffer: req.file.buffer,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          allowedMimeTypes,
          maxSizeBytes,
        });

        if (validationError) {
          return next(new Error(validationError));
        }

        const filename = createSafeFilename(req.file);
        req.file.filename = filename;
        const key = `${safeRelativeDir}/${filename}`.replace(/^\/+/, '');
        req.file.storageKey = key;

        if (uploadToR2) {
          await putObject({
            key,
            body: req.file.buffer,
            contentType: req.file.mimetype,
          });
          req.file.publicUrl = toPublicUrlFromKey(key);
          delete req.file.buffer;
        }
        return next();
      } catch (uploadError) {
        return next(uploadError);
      }
    });
  };

  return {
    single: (field) => wrap(uploader.single(field)),
  };
};

const toPublicUploadPath = (relativeDir, filename) => {
  const safeRelativeDir = sanitizeRelativeDir(relativeDir);
  const safeFilename = String(filename || '').replace(/^\/+/, '');
  const key = `${safeRelativeDir}/${safeFilename}`.replace(/^\/+/, '');
  return toPublicUrlFromKey(key);
};

module.exports = {
  createUploadMiddleware,
  toPublicUploadPath,
  sanitizeRelativeDir,
  createSafeFilename,
};
