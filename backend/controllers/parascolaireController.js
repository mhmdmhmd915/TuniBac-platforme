const {
  DEFAULT_BAC_SECTION,
  resolveRequestedBacSection,
  withSectionFilter,
} = require('../utils/bacSection');
const prisma = require('../lib/prisma');
const { toPublicUploadPath } = require('../utils/uploads');
const { deleteObject, normalizeStoredFileValueToKey, toPublicUrlFromStoredValue } = require('../lib/r2');
const { sendError } = require('../utils/http');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const { IMAGE_MAX_SIZE_BYTES, IMAGE_MIME_TYPES, PDF_MAX_SIZE_BYTES, PDF_MIME_TYPES } = require('../utils/uploadPolicies');

const normalizeBool = (value) => value === true || value === 'true';

const parseOptionalPrice = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? NaN : parsed;
};

const validateParascolaireInput = (payload) => {
  const title = String(payload.title || '').trim();
  const category = String(payload.category || '').trim();
  const hasPdf = normalizeBool(payload.hasPdf);
  const hasPaperBook = normalizeBool(payload.hasPaperBook);
  const isFree = normalizeBool(payload.isFree);
  const pdfPrice = parseOptionalPrice(payload.pdfPrice);
  const paperPrice = parseOptionalPrice(payload.paperPrice);
  const pdfUrl = String(payload.pdfUrl || '').trim();
  const paperOrderUrl = String(payload.paperOrderUrl || '').trim();

  if (!title) {
    return 'Title is required';
  }

  if (!category) {
    return 'Category is required';
  }

  if (!hasPdf && !hasPaperBook) {
    return 'At least one format must be selected';
  }

  if (hasPdf && !pdfUrl) {
    return 'PDF file is required when PDF format is selected';
  }

  if (hasPdf && !isFree && (pdfPrice === null || Number.isNaN(pdfPrice) || pdfPrice < 0)) {
    return 'A valid PDF price is required for paid PDFs';
  }

  if (hasPaperBook && (paperPrice === null || Number.isNaN(paperPrice) || paperPrice < 0)) {
    return 'A valid paper book price is required';
  }

  if (hasPaperBook && !paperOrderUrl) {
    return 'Paper book order link is required';
  }

  return null;
};

const getUploadedFileUrl = (relativeDir, file) => {
  if (!file?.filename) {
    return null;
  }

  return toPublicUploadPath(relativeDir, file.filename);
};

const mapParascolaireFiles = (item) => {
  if (!item) return item;
  return {
    ...item,
    coverImage: item.coverImage ? toPublicUrlFromStoredValue(item.coverImage) : null,
    pdfUrl: item.pdfUrl ? toPublicUrlFromStoredValue(item.pdfUrl) : null,
  };
};

// Get all parascolaires (public)
const getAllParascolaires = async (req, res) => {
  try {
    const parascolaires = await prisma.parascolaire.findMany({
      where: withSectionFilter(req),
      orderBy: { createdAt: 'desc' },
    });
    res.json(parascolaires.map(mapParascolaireFiles));
  } catch (error) {
    sendError(res, 500, 'Error fetching parascolaires', error);
  }
};

// Get single parascolaire by id (public)
const getParascolaireById = async (req, res) => {
  try {
    const { id } = req.params;
    const parascolaire = await prisma.parascolaire.findFirst({
      where: {
        id,
        ...withSectionFilter(req),
      },
    });
    if (!parascolaire) {
      return res.status(404).json({ message: 'Parascolaire not found' });
    }
    res.json(mapParascolaireFiles(parascolaire));
  } catch (error) {
    sendError(res, 500, 'Error fetching parascolaire', error);
  }
};

// Create parascolaire (admin only)
const createParascolaire = async (req, res) => {
  try {
    const {
      title,
      description,
      bacSection,
      coverImage,
      category,
      isFree,
      hasPdf,
      pdfUrl,
      pdfPrice,
      hasPaperBook,
      paperPrice,
      paperOrderUrl,
    } = req.body;

    const validationError = validateParascolaireInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const parsedIsFree = normalizeBool(isFree);
    const parsedHasPdf = normalizeBool(hasPdf);
    const parsedHasPaperBook = normalizeBool(hasPaperBook);
    const normalizedCoverImage = coverImage ? normalizeStoredFileValueToKey(coverImage) : null;
    const normalizedPdfUrl = parsedHasPdf && pdfUrl ? normalizeStoredFileValueToKey(pdfUrl) : null;

    await Promise.all([
      normalizedCoverImage
        ? validateStoredUpload({
            storedValue: normalizedCoverImage,
            allowedMimeTypes: IMAGE_MIME_TYPES,
            maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
      normalizedPdfUrl
        ? validateStoredUpload({
            storedValue: normalizedPdfUrl,
            allowedMimeTypes: PDF_MIME_TYPES,
            maxSizeBytes: PDF_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
    ]);

    const data = {
      title,
      description,
      bacSection: resolveRequestedBacSection(bacSection) || DEFAULT_BAC_SECTION,
      coverImage: normalizedCoverImage,
      category,
      isFree: parsedIsFree,
      hasPdf: parsedHasPdf,
      hasPaperBook: parsedHasPaperBook,
    };

    // Handle PDF fields
    if (parsedHasPdf) {
      data.pdfUrl = normalizedPdfUrl;
      data.pdfPrice = parsedIsFree ? 0 : parseOptionalPrice(pdfPrice);
    }

    // Handle Paper book fields
    if (parsedHasPaperBook) {
      data.paperPrice = parseOptionalPrice(paperPrice);
      data.paperOrderUrl = paperOrderUrl;
    }

    const parascolaire = await prisma.parascolaire.create({
      data,
    });
    res.status(201).json(mapParascolaireFiles(parascolaire));
  } catch (error) {
    sendError(res, 500, 'Error creating parascolaire', error);
  }
};

// Update parascolaire (admin only)
const updateParascolaire = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      bacSection,
      coverImage,
      category,
      isFree,
      hasPdf,
      pdfUrl,
      pdfPrice,
      hasPaperBook,
      paperPrice,
      paperOrderUrl,
    } = req.body;

    const validationError = validateParascolaireInput(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const parsedIsFree = normalizeBool(isFree);
    const parsedHasPdf = normalizeBool(hasPdf);
    const parsedHasPaperBook = normalizeBool(hasPaperBook);
    const normalizedCoverImage = coverImage ? normalizeStoredFileValueToKey(coverImage) : null;
    const normalizedPdfUrl = parsedHasPdf && pdfUrl ? normalizeStoredFileValueToKey(pdfUrl) : null;

    await Promise.all([
      normalizedCoverImage
        ? validateStoredUpload({
            storedValue: normalizedCoverImage,
            allowedMimeTypes: IMAGE_MIME_TYPES,
            maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
      normalizedPdfUrl
        ? validateStoredUpload({
            storedValue: normalizedPdfUrl,
            allowedMimeTypes: PDF_MIME_TYPES,
            maxSizeBytes: PDF_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
    ]);

    const data = {
      title,
      description,
      bacSection: resolveRequestedBacSection(bacSection) || DEFAULT_BAC_SECTION,
      coverImage: normalizedCoverImage,
      category,
      isFree: parsedIsFree,
      hasPdf: parsedHasPdf,
      hasPaperBook: parsedHasPaperBook,
    };

    // Handle PDF fields
    if (parsedHasPdf) {
      data.pdfUrl = normalizedPdfUrl;
      data.pdfPrice = parsedIsFree ? 0 : parseOptionalPrice(pdfPrice);
    } else {
      data.pdfUrl = null;
      data.pdfPrice = null;
    }

    // Handle Paper book fields
    if (parsedHasPaperBook) {
      data.paperPrice = parseOptionalPrice(paperPrice);
      data.paperOrderUrl = paperOrderUrl;
    } else {
      data.paperPrice = null;
      data.paperOrderUrl = null;
    }

    const parascolaire = await prisma.parascolaire.update({
      where: { id },
      data,
    });
    res.json(mapParascolaireFiles(parascolaire));
  } catch (error) {
    sendError(res, 500, 'Error updating parascolaire', error);
  }
};

// Delete parascolaire (admin only)
const deleteParascolaire = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.parascolaire.findUnique({
      where: { id },
      select: { coverImage: true, pdfUrl: true },
    });
    await prisma.parascolaire.delete({ where: { id } });
    const keys = [existing?.coverImage, existing?.pdfUrl].filter(
      (value) => value && !/^https?:\/\//i.test(String(value))
    );
    await Promise.all(keys.map((key) => deleteObject(key)));
    res.json({ message: 'Parascolaire deleted successfully' });
  } catch (error) {
    sendError(res, 500, 'Error deleting parascolaire', error);
  }
};

// Upload cover image (admin only)
const uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No cover image uploaded' });
    }

    res.json({
      fileUrl: getUploadedFileUrl('parascolaires/covers', req.file),
    });
  } catch (error) {
    sendError(res, 500, 'Error uploading cover image', error);
  }
};

// Upload PDF (admin only)
const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    res.json({
      fileUrl: getUploadedFileUrl('parascolaires/pdfs', req.file),
    });
  } catch (error) {
    sendError(res, 500, 'Error uploading PDF', error);
  }
};

module.exports = {
  getAllParascolaires,
  getParascolaireById,
  createParascolaire,
  updateParascolaire,
  deleteParascolaire,
  uploadCoverImage,
  uploadPdf,
};
