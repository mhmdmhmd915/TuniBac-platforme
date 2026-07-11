const IMAGE_MIME_TYPES = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];
const PDF_MIME_TYPES = ['application/pdf'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime'];
const DOCX_MIME_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const RESOURCE_MIME_TYPES = [...PDF_MIME_TYPES, ...DOCX_MIME_TYPES, ...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];

const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MAX_SIZE_BYTES = 25 * 1024 * 1024;
const VIDEO_MAX_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
const HOMEWORK_MAX_SIZE_BYTES = 15 * 1024 * 1024;
const RESOURCE_MAX_SIZE_BYTES = 200 * 1024 * 1024;

module.exports = {
  DOCX_MIME_TYPES,
  HOMEWORK_MAX_SIZE_BYTES,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
  PDF_MAX_SIZE_BYTES,
  PDF_MIME_TYPES,
  RESOURCE_MAX_SIZE_BYTES,
  RESOURCE_MIME_TYPES,
  VIDEO_MAX_SIZE_BYTES,
  VIDEO_MIME_TYPES,
};
