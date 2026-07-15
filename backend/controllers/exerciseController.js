const { withSectionFilter } = require('../utils/bacSection');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { deleteObject, normalizeStoredFileValueToKey, toPublicUrlFromStoredValue } = require('../lib/r2');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const {
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
  PDF_MAX_SIZE_BYTES,
  PDF_MIME_TYPES,
} = require('../utils/uploadPolicies');

const EXERCISE_LIST_SELECT = {
  id: true,
  title: true,
  description: true,
  contentUrl: true,
  advertisementImage: true,
  advertisementTeacherName: true,
  advertisementSubject: true,
  advertisementWhatsapp: true,
  advertisementDescription: true,
  difficulty: true,
  createdAt: true,
  updatedAt: true,
  subject: {
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      bacSection: true,
    },
  },
  corrections: {
    select: {
      id: true,
      title: true,
      contentUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  resources: {
    select: {
      id: true,
      title: true,
      type: true,
      url: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
};

const mapExerciseFiles = (exercise) => {
  if (!exercise) return exercise;
  return {
    ...exercise,
    contentUrl: exercise.contentUrl ? toPublicUrlFromStoredValue(exercise.contentUrl) : null,
    advertisementImage: exercise.advertisementImage
      ? toPublicUrlFromStoredValue(exercise.advertisementImage)
      : null,
    corrections: Array.isArray(exercise.corrections)
      ? exercise.corrections.map((correction) => ({
          ...correction,
          contentUrl: correction.contentUrl ? toPublicUrlFromStoredValue(correction.contentUrl) : null,
        }))
      : exercise.corrections,
    resources: Array.isArray(exercise.resources)
      ? exercise.resources.map((resource) => ({
          ...resource,
          url: resource.url ? toPublicUrlFromStoredValue(resource.url) : resource.url,
        }))
      : exercise.resources,
  };
};

const normalizeOptionalText = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const normalizeWhatsapp = (value) => {
  const digits = String(value || '').replace(/\D+/g, '');
  return digits || null;
};

const getAllExercises = async (req, res) => {
  try {
    const { subjectId, difficulty } = req.query;
    const page = Number.parseInt(String(req.query.page || ''), 10);
    const pageSize = Number.parseInt(String(req.query.pageSize || ''), 10);
    const shouldPaginate = Number.isFinite(page) || Number.isFinite(pageSize);
    const resolvedPage = Math.max(1, Number.isFinite(page) ? page : 1);
    const resolvedPageSize = Math.min(100, Math.max(1, Number.isFinite(pageSize) ? pageSize : 20));

    const where = {
      ...withSectionFilter(req, 'subject.bacSection'),
      ...(subjectId && { subjectId }),
      ...(difficulty && { difficulty }),
    };

    const query = {
      where,
      orderBy: [{ createdAt: 'desc' }, { title: 'asc' }],
      select: EXERCISE_LIST_SELECT,
      ...(shouldPaginate
        ? {
            skip: (resolvedPage - 1) * resolvedPageSize,
            take: resolvedPageSize,
          }
        : {}),
    };

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany(query),
      shouldPaginate ? prisma.exercise.count({ where }) : Promise.resolve(null),
    ]);

    const mapped = exercises.map(mapExerciseFiles);
    if (shouldPaginate) {
      return res.json({
        items: mapped,
        total,
        page: resolvedPage,
        pageSize: resolvedPageSize,
      });
    }

    res.json(mapped);
  } catch (error) {
    sendError(res, 500, 'Error fetching exercises', error);
  }
};

const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;
    const exercise = await prisma.exercise.findFirst({
      where: {
        id,
        ...withSectionFilter(req, 'subject.bacSection'),
      },
      select: EXERCISE_LIST_SELECT,
    });
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
    res.json(mapExerciseFiles(exercise));
  } catch (error) {
    sendError(res, 500, 'Error fetching exercise', error);
  }
};

const createExercise = async (req, res) => {
  try {
    const {
      title,
      description,
      contentUrl,
      difficulty,
      subjectId,
      advertisementImage,
      advertisementTeacherName,
      advertisementSubject,
      advertisementWhatsapp,
      advertisementDescription,
    } = req.body;
    const normalizedContentUrl = contentUrl ? normalizeStoredFileValueToKey(contentUrl) : null;
    const normalizedAdvertisementImage = advertisementImage
      ? normalizeStoredFileValueToKey(advertisementImage)
      : null;

    await Promise.all([
      normalizedContentUrl
        ? validateStoredUpload({
            storedValue: normalizedContentUrl,
            allowedMimeTypes: PDF_MIME_TYPES,
            maxSizeBytes: PDF_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
      normalizedAdvertisementImage
        ? validateStoredUpload({
            storedValue: normalizedAdvertisementImage,
            allowedMimeTypes: IMAGE_MIME_TYPES,
            maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
    ]);
    
    const exercise = await prisma.exercise.create({
      data: {
        title,
        description,
        contentUrl: normalizedContentUrl,
        advertisementImage: normalizedAdvertisementImage,
        advertisementTeacherName: normalizeOptionalText(advertisementTeacherName),
        advertisementSubject: normalizeOptionalText(advertisementSubject),
        advertisementWhatsapp: normalizeWhatsapp(advertisementWhatsapp),
        advertisementDescription: normalizeOptionalText(advertisementDescription),
        difficulty,
        subjectId,
      },
      include: { subject: true },
    });
    res.status(201).json(mapExerciseFiles(exercise));
  } catch (error) {
    sendError(res, 500, 'Error creating exercise', error);
  }
};

const updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      contentUrl,
      difficulty,
      subjectId,
      advertisementImage,
      advertisementTeacherName,
      advertisementSubject,
      advertisementWhatsapp,
      advertisementDescription,
    } = req.body;
    const normalizedContentUrl = contentUrl ? normalizeStoredFileValueToKey(contentUrl) : null;
    const normalizedAdvertisementImage = advertisementImage
      ? normalizeStoredFileValueToKey(advertisementImage)
      : null;

    await Promise.all([
      normalizedContentUrl
        ? validateStoredUpload({
            storedValue: normalizedContentUrl,
            allowedMimeTypes: PDF_MIME_TYPES,
            maxSizeBytes: PDF_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
      normalizedAdvertisementImage
        ? validateStoredUpload({
            storedValue: normalizedAdvertisementImage,
            allowedMimeTypes: IMAGE_MIME_TYPES,
            maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
    ]);
    
    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        title,
        description,
        contentUrl: normalizedContentUrl,
        advertisementImage: normalizedAdvertisementImage,
        advertisementTeacherName: normalizeOptionalText(advertisementTeacherName),
        advertisementSubject: normalizeOptionalText(advertisementSubject),
        advertisementWhatsapp: normalizeWhatsapp(advertisementWhatsapp),
        advertisementDescription: normalizeOptionalText(advertisementDescription),
        difficulty,
        subjectId,
      },
      include: { subject: true },
    });
    res.json(mapExerciseFiles(exercise));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    sendError(res, 500, 'Error updating exercise', error);
  }
};

const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.exercise.findUnique({
      where: { id },
      select: {
        contentUrl: true,
        advertisementImage: true,
        corrections: { select: { contentUrl: true } },
        resources: { select: { url: true } },
      },
    });
    await prisma.$transaction([
      prisma.correction.deleteMany({ where: { exerciseId: id } }),
      prisma.exerciseResource.deleteMany({ where: { exerciseId: id } }),
      prisma.exercise.delete({ where: { id } }),
    ]);
    const keys = [
      existing?.contentUrl,
      existing?.advertisementImage,
      ...(existing?.corrections || []).map((c) => c.contentUrl),
      ...(existing?.resources || []).map((r) => r.url),
    ].filter((value) => value && !/^https?:\/\//i.test(String(value)));
    await Promise.all(keys.map((key) => deleteObject(key)));
    res.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    sendError(res, 500, 'Error deleting exercise', error);
  }
};

module.exports = { getAllExercises, getExerciseById, createExercise, updateExercise, deleteExercise };
