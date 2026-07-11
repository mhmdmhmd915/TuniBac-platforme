const express = require('express');
const router = express.Router();
const { createUploadMiddleware, createSafeFilename, sanitizeRelativeDir } = require('../utils/uploads');
const { createPresignedUpload } = require('../lib/r2');
const { validateRequestedUpload } = require('../utils/fileSecurity');
const {
  getAllParascolaires,
  getParascolaireById,
  createParascolaire,
  updateParascolaire,
  deleteParascolaire,
  uploadCoverImage,
  uploadPdf,
} = require('../controllers/parascolaireController');
const { authMiddleware, adminMiddleware, optionalAuthUserMiddleware } = require('../middleware/authMiddleware');

const uploadCover = createUploadMiddleware({
  relativeDir: 'parascolaires/covers',
  allowedMimeTypes: ['image/gif', 'image/jpeg', 'image/png', 'image/webp'],
  maxSizeBytes: 10 * 1024 * 1024,
});

const uploadPdfFile = createUploadMiddleware({
  relativeDir: 'parascolaires/pdfs',
  allowedMimeTypes: ['application/pdf'],
  maxSizeBytes: 25 * 1024 * 1024,
});

const createSignedUploadHandler = ({ relativeDir, allowedMimeTypes, maxSizeBytes, buildResponse }) =>
  async (req, res) => {
    const { filename, contentType, sizeBytes } = req.body || {};
    const validationError = validateRequestedUpload({
      filename,
      contentType,
      sizeBytes,
      allowedMimeTypes,
      maxSizeBytes,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedContentType = String(contentType || '').toLowerCase();
    const safeRelativeDir = sanitizeRelativeDir(relativeDir);
    const generatedFilename = createSafeFilename({
      mimetype: normalizedContentType,
      originalname: String(filename || ''),
    });
    const key = `${safeRelativeDir}/${generatedFilename}`.replace(/^\/+/, '');
    const signed = await createPresignedUpload({
      key,
      contentType: normalizedContentType,
    });

    return res.json(
      buildResponse({
        uploadUrl: signed.uploadUrl,
        publicUrl: signed.publicUrl,
        key: signed.key,
        filename: generatedFilename,
      })
    );
  };

// Public routes
router.get('/', optionalAuthUserMiddleware, getAllParascolaires);
router.get('/:id', optionalAuthUserMiddleware, getParascolaireById);

// Admin only routes
router.post('/', authMiddleware, adminMiddleware, createParascolaire);
router.put('/:id', authMiddleware, adminMiddleware, updateParascolaire);
router.delete('/:id', authMiddleware, adminMiddleware, deleteParascolaire);
router.post('/upload-cover', authMiddleware, adminMiddleware, uploadCover.single('cover'), uploadCoverImage);
router.post('/upload-pdf', authMiddleware, adminMiddleware, uploadPdfFile.single('pdf'), uploadPdf);
router.post(
  '/upload-cover/presign',
  authMiddleware,
  adminMiddleware,
  createSignedUploadHandler({
    relativeDir: 'parascolaires/covers',
    allowedMimeTypes: ['image/gif', 'image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024,
    buildResponse: ({ uploadUrl, publicUrl, key, filename }) => ({
      uploadUrl,
      fileUrl: publicUrl,
      key,
      filename,
    }),
  })
);
router.post(
  '/upload-pdf/presign',
  authMiddleware,
  adminMiddleware,
  createSignedUploadHandler({
    relativeDir: 'parascolaires/pdfs',
    allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 25 * 1024 * 1024,
    buildResponse: ({ uploadUrl, publicUrl, key, filename }) => ({
      uploadUrl,
      fileUrl: publicUrl,
      key,
      filename,
    }),
  })
);

module.exports = router;
