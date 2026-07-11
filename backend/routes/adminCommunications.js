const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { createUploadMiddleware, toPublicUploadPath, createSafeFilename, sanitizeRelativeDir } = require('../utils/uploads');
const {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartPartUploadUrl,
  createMultipartUpload,
  createPresignedUpload,
} = require('../lib/r2');
const {
  archiveCommunication,
  createCommunication,
  deleteCommunication,
  duplicateCommunication,
  getAdminCommunications,
  getCommunicationById,
  publishCommunication,
  scheduleCommunication,
  setCommunicationVisibility,
  updateCommunication,
} = require('../controllers/communicationController');
const { validateRequestedUpload } = require('../utils/fileSecurity');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');

const router = express.Router();

const uploadImage = createUploadMiddleware({
  relativeDir: 'communications/images',
  allowedMimeTypes: ['image/gif', 'image/jpeg', 'image/png', 'image/webp'],
  maxSizeBytes: 10 * 1024 * 1024,
});

const uploadPdf = createUploadMiddleware({
  relativeDir: 'communications/pdfs',
  allowedMimeTypes: ['application/pdf'],
  maxSizeBytes: 25 * 1024 * 1024,
});

const uploadVideo = createUploadMiddleware({
  relativeDir: 'communications/videos',
  allowedMimeTypes: ['video/mp4', 'video/quicktime'],
  maxSizeBytes: 200 * 1024 * 1024,
});

const VIDEO_MAX_SIZE_BYTES = 5 * 1024 * 1024 * 1024;

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
    const requestedSize = Number(sizeBytes || 0);
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
        contentType: normalizedContentType,
        sizeBytes: requestedSize || null,
        originalFilename: String(filename || generatedFilename),
      })
    );
  };

const createMultipartVideoHandlers = ({
  relativeDir,
  allowedMimeTypes,
  maxSizeBytes,
  buildCompleteResponse,
}) => {
  const initiate = async (req, res) => {
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
    const requestedSize = Number(sizeBytes || 0);
    const safeRelativeDir = sanitizeRelativeDir(relativeDir);
    const generatedFilename = createSafeFilename({
      mimetype: normalizedContentType,
      originalname: String(filename || ''),
    });
    const key = `${safeRelativeDir}/${generatedFilename}`.replace(/^\/+/, '');
    const multipart = await createMultipartUpload({
      key,
      contentType: normalizedContentType,
      sizeBytes: requestedSize,
    });

    return res.json({
      uploadId: multipart.uploadId,
      key: multipart.key,
      publicUrl: multipart.publicUrl,
      partSize: multipart.partSize,
      totalParts: Math.ceil(requestedSize / multipart.partSize),
      expiresIn: multipart.expiresIn,
      maxRetries: 4,
      maxConcurrency: 3,
    });
  };

  const signPart = async (req, res) => {
    const { key, uploadId, partNumber } = req.body || {};
    const signed = await createMultipartPartUploadUrl({
      key,
      uploadId,
      partNumber,
    });

    return res.json(signed);
  };

  const complete = async (req, res) => {
    const { key, uploadId, partNumbers } = req.body || {};
    const completed = await completeMultipartUpload({
      key,
      uploadId,
      partNumbers,
    });

    await validateStoredUpload({
      storedValue: completed.key,
      allowedMimeTypes,
      maxSizeBytes,
    });

    return res.json(
      buildCompleteResponse({
        key: completed.key,
        publicUrl: completed.publicUrl,
      })
    );
  };

  const abort = async (req, res) => {
    const { key, uploadId } = req.body || {};
    await abortMultipartUpload({ key, uploadId });
    return res.status(200).json({ success: true });
  };

  return { initiate, signPart, complete, abort };
};

const communicationVideoMultipartHandlers = createMultipartVideoHandlers({
  relativeDir: 'communications/videos',
  allowedMimeTypes: ['video/mp4', 'video/quicktime'],
  maxSizeBytes: VIDEO_MAX_SIZE_BYTES,
  buildCompleteResponse: ({ key, publicUrl }) => ({
    key,
    attachment: {
      kind: 'VIDEO',
      label: '',
      filePath: publicUrl,
      mimeType: 'video/mp4',
      sizeBytes: null,
    },
  }),
});

const handleUploadResponse = (kind, subfolder) => (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: `No ${kind.toLowerCase()} file uploaded` });
  }

  res.json({
    attachment: {
      kind,
      label: req.file.originalname,
      filePath: toPublicUploadPath(`communications/${subfolder}`, req.file.filename),
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
  });
};

router.use(authMiddleware, adminMiddleware);

router.get('/', getAdminCommunications);
router.get('/:id', getCommunicationById);
router.post('/', createCommunication);
router.put('/:id', updateCommunication);
router.delete('/:id', deleteCommunication);
router.post('/:id/duplicate', duplicateCommunication);
router.patch('/:id/visibility', setCommunicationVisibility);
router.post('/:id/publish', publishCommunication);
router.post('/:id/schedule', scheduleCommunication);
router.post('/:id/archive', archiveCommunication);

router.post('/uploads/image', uploadImage.single('file'), handleUploadResponse('IMAGE', 'images'));
router.post('/uploads/pdf', uploadPdf.single('file'), handleUploadResponse('PDF', 'pdfs'));
router.post('/uploads/video', uploadVideo.single('file'), handleUploadResponse('VIDEO', 'videos'));
router.post(
  '/uploads/image/presign',
  createSignedUploadHandler({
    relativeDir: 'communications/images',
    allowedMimeTypes: ['image/gif', 'image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 10 * 1024 * 1024,
    buildResponse: ({ uploadUrl, publicUrl, contentType, sizeBytes, originalFilename }) => ({
      uploadUrl,
      attachment: {
        kind: 'IMAGE',
        label: originalFilename,
        filePath: publicUrl,
        mimeType: contentType,
        sizeBytes,
      },
    }),
  })
);
router.post(
  '/uploads/pdf/presign',
  createSignedUploadHandler({
    relativeDir: 'communications/pdfs',
    allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 25 * 1024 * 1024,
    buildResponse: ({ uploadUrl, publicUrl, contentType, sizeBytes, originalFilename }) => ({
      uploadUrl,
      attachment: {
        kind: 'PDF',
        label: originalFilename,
        filePath: publicUrl,
        mimeType: contentType,
        sizeBytes,
      },
    }),
  })
);
router.post(
  '/uploads/video/presign',
  createSignedUploadHandler({
    relativeDir: 'communications/videos',
    allowedMimeTypes: ['video/mp4', 'video/quicktime'],
    maxSizeBytes: 200 * 1024 * 1024,
    buildResponse: ({ uploadUrl, publicUrl, contentType, sizeBytes, originalFilename }) => ({
      uploadUrl,
      attachment: {
        kind: 'VIDEO',
        label: originalFilename,
        filePath: publicUrl,
        mimeType: contentType,
        sizeBytes,
      },
    }),
  })
);
router.post('/uploads/video/multipart/initiate', communicationVideoMultipartHandlers.initiate);
router.post('/uploads/video/multipart/sign-part', communicationVideoMultipartHandlers.signPart);
router.post('/uploads/video/multipart/complete', communicationVideoMultipartHandlers.complete);
router.post('/uploads/video/multipart/abort', communicationVideoMultipartHandlers.abort);

module.exports = router;
