const express = require('express');
const router = express.Router();
const { uploadHomework, getMySubmissions } = require('../controllers/homeworkController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { createUploadMiddleware } = require('../utils/uploads');
const { DOCX_MIME_TYPES, HOMEWORK_MAX_SIZE_BYTES, PDF_MIME_TYPES, IMAGE_MIME_TYPES } = require('../utils/uploadPolicies');

const upload = createUploadMiddleware({
  relativeDir: 'homeworks',
  allowedMimeTypes: [
    ...PDF_MIME_TYPES,
    ...DOCX_MIME_TYPES,
    'image/jpeg',
    'image/png',
  ],
  maxSizeBytes: HOMEWORK_MAX_SIZE_BYTES,
});

router.post('/upload', authMiddleware, upload.single('homework'), uploadHomework);
router.get('/my-submissions', authMiddleware, getMySubmissions);

module.exports = router;
