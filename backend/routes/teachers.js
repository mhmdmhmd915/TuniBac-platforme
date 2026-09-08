const express = require('express');
const router = express.Router();

const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const {
  getMyProfile,
  updateMyProfile,
  getMyContent,
  getTeacherScopeInfo,
  listPublicTeachers,
  getPublicProfile,
} = require('../controllers/teacherController');
const { createUploadMiddleware, toPublicUploadPath, createSafeFilename, sanitizeRelativeDir } = require('../utils/uploads');
const { createPresignedUpload } = require('../lib/r2');
const { validateRequestedUpload } = require('../utils/fileSecurity');
const { IMAGE_MAX_SIZE_BYTES, IMAGE_MIME_TYPES } = require('../utils/uploadPolicies');

// Public teacher profile (must be public + approved)
router.get('/public', listPublicTeachers);
router.get('/:id/public', getPublicProfile);

// Teacher-only
router.use(authMiddleware, roleMiddleware(['TEACHER', 'ADMIN']));
router.get('/me', getMyProfile);
router.put('/profile', updateMyProfile);
router.get('/content', getMyContent);
router.get('/scope', getTeacherScopeInfo);

// Teacher photo upload
const uploadTeacherPhoto = createUploadMiddleware({
  relativeDir: 'teacher-profiles',
  allowedMimeTypes: IMAGE_MIME_TYPES,
  maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
});

router.post('/photo', uploadTeacherPhoto.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No photo file uploaded' });
  }
  res.json({
    fileUrl: toPublicUploadPath('teacher-profiles', req.file.filename),
    filename: req.file.filename,
  });
});

router.post('/photo/presign', async (req, res) => {
  const { filename, contentType, sizeBytes } = req.body || {};
  const validationError = validateRequestedUpload({
    filename,
    contentType,
    sizeBytes,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
  });

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const normalizedContentType = String(contentType || '').toLowerCase();
  const safeRelativeDir = sanitizeRelativeDir('teacher-profiles');
  const generatedFilename = createSafeFilename({
    mimetype: normalizedContentType,
    originalname: String(filename || ''),
  });
  const key = `${safeRelativeDir}/${generatedFilename}`.replace(/^\/+/, '');
  const signed = await createPresignedUpload({
    key,
    contentType: normalizedContentType,
  });

  return res.json({
    uploadUrl: signed.uploadUrl,
    publicUrl: signed.publicUrl,
    key: signed.key,
    filename: generatedFilename,
    contentType: normalizedContentType,
    sizeBytes: Number(sizeBytes || 0) || null,
  });
});

module.exports = router;
