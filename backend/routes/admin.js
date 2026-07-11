const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { createUploadMiddleware, toPublicUploadPath, createSafeFilename, sanitizeRelativeDir } = require('../utils/uploads');
const {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartPartUploadUrl,
  createMultipartUpload,
  createPresignedUpload,
} = require('../lib/r2');
const prisma = require('../lib/prisma');
const {
  createCourseResource,
  createExerciseResource,
  createExerciseCorrection,
  deleteExerciseResource,
  deleteExerciseCorrection,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getDashboardStats,
  addCourseResource,
  deleteCourseResource,
  uploadSubmissionCorrection,
  getAllSubmissions,
  reviewSubmission,
  approveUser,
  rejectUser,
  suspendUser,
  reactivateUser,
  updateUser,
  bulkApproveUsers,
  bulkSuspendUsers,
  bulkDeleteUsers,
  updateUserPassword
} = require('../controllers/adminController');
const { validateRequestedUpload } = require('../utils/fileSecurity');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const {
  getSettings,
  updateSettings,
  uploadSettingAsset,
} = require('../controllers/settingsController');
const {
  DOCX_MIME_TYPES,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
  PDF_MAX_SIZE_BYTES,
  PDF_MIME_TYPES,
  RESOURCE_MAX_SIZE_BYTES,
  RESOURCE_MIME_TYPES,
  VIDEO_MAX_SIZE_BYTES,
  VIDEO_MIME_TYPES,
} = require('../utils/uploadPolicies');
const {
  listUploads,
  deleteUpload,
  replaceUpload,
} = require('../controllers/uploadsController');
const {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectUsage,
} = require('../controllers/subjectController');


const uploadCoursePdf = createUploadMiddleware({
  relativeDir: 'courses',
  allowedMimeTypes: PDF_MIME_TYPES,
  maxSizeBytes: PDF_MAX_SIZE_BYTES,
});

const uploadSettingFile = createUploadMiddleware({
  relativeDir: 'settings',
  allowedMimeTypes: [
    ...PDF_MIME_TYPES,
    ...IMAGE_MIME_TYPES,
    ...VIDEO_MIME_TYPES,
  ],
  maxSizeBytes: 50 * 1024 * 1024,
});

const uploadExercisePdf = createUploadMiddleware({
  relativeDir: 'exercises',
  allowedMimeTypes: PDF_MIME_TYPES,
  maxSizeBytes: PDF_MAX_SIZE_BYTES,
});

const uploadExerciseCorrection = createUploadMiddleware({
  relativeDir: 'exercise-corrections',
  allowedMimeTypes: PDF_MIME_TYPES,
  maxSizeBytes: PDF_MAX_SIZE_BYTES,
});

const uploadVideo = createUploadMiddleware({
  relativeDir: 'videos',
  allowedMimeTypes: VIDEO_MIME_TYPES,
  maxSizeBytes: 200 * 1024 * 1024,
});

const uploadReplacement = createUploadMiddleware({
  relativeDir: 'tmp',
  allowedMimeTypes: [...RESOURCE_MIME_TYPES],
  maxSizeBytes: RESOURCE_MAX_SIZE_BYTES,
  uploadToR2: false,
});

const uploadCorrection = createUploadMiddleware({
  relativeDir: 'corrections',
  allowedMimeTypes: PDF_MIME_TYPES,
  maxSizeBytes: PDF_MAX_SIZE_BYTES,
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
  onComplete,
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

    if (typeof onComplete === 'function') {
      await onComplete({
        req,
        key: completed.key,
        publicUrl: completed.publicUrl,
      });
    }

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

const adminVideoMultipartHandlers = createMultipartVideoHandlers({
  relativeDir: 'videos',
  allowedMimeTypes: VIDEO_MIME_TYPES,
  maxSizeBytes: VIDEO_MAX_SIZE_BYTES,
  buildCompleteResponse: ({ key, publicUrl }) => ({
    key,
    videoPath: publicUrl,
  }),
});

const offerVideoMultipartHandlers = createMultipartVideoHandlers({
  relativeDir: 'settings',
  allowedMimeTypes: VIDEO_MIME_TYPES,
  maxSizeBytes: VIDEO_MAX_SIZE_BYTES,
  buildCompleteResponse: ({ key, publicUrl }) => ({
    key,
    fileUrl: publicUrl,
  }),
  onComplete: async ({ req, key }) => {
    const actorId = req.user?.id || null;
    await prisma.appSetting.upsert({
      where: { key: 'platformOfferVideoUrl' },
      create: { key: 'platformOfferVideoUrl', value: key, updatedBy: actorId },
      update: { value: key, updatedBy: actorId },
    });
  },
});

// =======================
// Admin Protection
// =======================

router.use(authMiddleware, adminMiddleware);

// =======================
// Dashboard
// =======================

router.get('/stats', getDashboardStats);

// =======================
// Settings
// =======================

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/settings/upload/:asset', uploadSettingFile.single('file'), uploadSettingAsset);
router.post('/settings/upload/offer-video/multipart/initiate', offerVideoMultipartHandlers.initiate);
router.post('/settings/upload/offer-video/multipart/sign-part', offerVideoMultipartHandlers.signPart);
router.post('/settings/upload/offer-video/multipart/complete', offerVideoMultipartHandlers.complete);
router.post('/settings/upload/offer-video/multipart/abort', offerVideoMultipartHandlers.abort);

// =======================
// User Management
// =======================

router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id', updateUser);
router.put('/users/:id/password', updateUserPassword);
router.delete('/users/:id', deleteUser);

// User status actions
router.put('/users/:id/approve', approveUser);
router.put('/users/:id/reject', rejectUser);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/reactivate', reactivateUser);

// Bulk actions
router.post('/users/bulk-approve', bulkApproveUsers);
router.post('/users/bulk-suspend', bulkSuspendUsers);
router.post('/users/bulk-delete', bulkDeleteUsers);

// Course resources
router.post('/resources', createCourseResource);
router.post('/courses/:id/resources', addCourseResource);
router.delete('/resources/:id', deleteCourseResource);

// =======================
// Subject Management
// =======================

router.get('/subjects', getAllSubjects);
router.get('/subjects/:id', getSubjectById);
router.get('/subjects/:id/usage', getSubjectUsage);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

// =======================
// Exercise Management
// =======================

router.post(
  '/courses/upload-pdf',
  uploadCoursePdf.single('pdf'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }
    res.json({
      fileUrl: toPublicUploadPath('courses', req.file.filename),
    });
  }
);
router.post(
  '/courses/upload-pdf/presign',
  createSignedUploadHandler({
    relativeDir: 'courses',
    allowedMimeTypes: PDF_MIME_TYPES,
    maxSizeBytes: PDF_MAX_SIZE_BYTES,
    buildResponse: ({ uploadUrl, publicUrl, key, filename }) => ({
      uploadUrl,
      fileUrl: publicUrl,
      key,
      filename,
    }),
  })
);

router.post('/uploads/video', uploadVideo.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No video file uploaded' });
  }
  const videoPath = toPublicUploadPath('videos', req.file.filename);
  res.json({ videoPath, filename: req.file.filename });
});
router.post(
  '/uploads/video/presign',
  createSignedUploadHandler({
    relativeDir: 'videos',
    allowedMimeTypes: VIDEO_MIME_TYPES,
    maxSizeBytes: 200 * 1024 * 1024,
    buildResponse: ({ uploadUrl, publicUrl, key, filename }) => ({
      uploadUrl,
      videoPath: publicUrl,
      key,
      filename,
    }),
  })
);
router.post('/uploads/video/multipart/initiate', adminVideoMultipartHandlers.initiate);
router.post('/uploads/video/multipart/sign-part', adminVideoMultipartHandlers.signPart);
router.post('/uploads/video/multipart/complete', adminVideoMultipartHandlers.complete);
router.post('/uploads/video/multipart/abort', adminVideoMultipartHandlers.abort);

router.get('/uploads', listUploads);
router.delete('/uploads', deleteUpload);
router.post('/uploads/replace', uploadReplacement.single('file'), replaceUpload);

router.post(
  '/exercises/upload-pdf',
  uploadExercisePdf.single('pdf'),
  (req, res) => {
    res.json({
      fileUrl: toPublicUploadPath('exercises', req.file.filename),
    });
  }
);
router.post(
  '/exercises/upload-pdf/presign',
  createSignedUploadHandler({
    relativeDir: 'exercises',
    allowedMimeTypes: PDF_MIME_TYPES,
    maxSizeBytes: PDF_MAX_SIZE_BYTES,
    buildResponse: ({ uploadUrl, publicUrl, key, filename }) => ({
      uploadUrl,
      fileUrl: publicUrl,
      key,
      filename,
    }),
  })
);

router.post(
  '/exercise-correction',
  uploadExerciseCorrection.single('pdf'),
  createExerciseCorrection
);

router.post(
  '/exercise-resources',
  createExerciseResource
);  

router.delete('/exercise-resources/:id', deleteExerciseResource);
router.delete('/exercise-corrections/:id', deleteExerciseCorrection);

// =======================
// Homework Management
// =======================

router.get('/submissions', getAllSubmissions);

router.put('/submissions/:id/review', reviewSubmission);

// Upload correction PDF
router.put(
  '/submissions/:id/correction',
  uploadCorrection.single('correction'),
  uploadSubmissionCorrection
);

// =======================

module.exports = router; 
