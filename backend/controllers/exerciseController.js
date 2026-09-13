const { contentVisibilityWhere } = require('../utils/bacSection');
const { getTeacherScope, teacherCanManageSubject, resolveContentSections, assertTeacherScope } = require('../utils/learningPath');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { deleteObject, normalizeStoredFileValueToKey, toPublicUrlFromStoredValue } = require('../lib/r2');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const {
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
  PDF_MAX_SIZE_BYTES,
  PDF_MIME_TYPES,
  VIDEO_MAX_SIZE_BYTES,
  VIDEO_MIME_TYPES,
} = require('../utils/uploadPolicies');

const EXERCISE_LIST_SELECT = {
  id: true,
  title: true,
  description: true,
  contentUrl: true,
  videoUrl: true,
  videoPath: true,
  contentText: true,
  externalLink: true,
  groupTitle: true,
  tags: true,
  isPublished: true,
  order: true,
  courseId: true,
  teacherId: true,
  advertisementImage: true,
  advertisementTeacherName: true,
  advertisementSubject: true,
  advertisementWhatsapp: true,
  advertisementDescription: true,
  difficulty: true,
  createdAt: true,
  updatedAt: true,
  sectionAssignments: {
    select: { bacSection: true },
  },
  subject: {
    select: {
      id: true,
      name: true,
      color: true,
      icon: true,
      bacSection: true,
      subjectSections: { select: { bacSection: true } },
    },
  },
  course: {
    select: { id: true, title: true },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true },
  },
  corrections: {
    select: {
      id: true,
      title: true,
      description: true,
      contentText: true,
      videoUrl: true,
      videoPath: true,
      externalLink: true,
      difficulty: true,
      isPublished: true,
      order: true,
      contentUrl: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
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
    sections: (exercise.sectionAssignments || []).map((s) => s.bacSection),
    sectionAssignments: undefined,
    contentUrl: exercise.contentUrl ? toPublicUrlFromStoredValue(exercise.contentUrl) : null,
    videoPath: exercise.videoPath ? toPublicUrlFromStoredValue(exercise.videoPath) : null,
    advertisementImage: exercise.advertisementImage
      ? toPublicUrlFromStoredValue(exercise.advertisementImage)
      : null,
    corrections: Array.isArray(exercise.corrections)
      ? exercise.corrections.map((correction) => ({
          ...correction,
          contentUrl: correction.contentUrl ? toPublicUrlFromStoredValue(correction.contentUrl) : null,
          videoPath: correction.videoPath ? toPublicUrlFromStoredValue(correction.videoPath) : null,
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

const filterPublishedCorrectionsOnly = (mappedExercise) => {
  if (!mappedExercise) return mappedExercise;
  if (Array.isArray(mappedExercise.corrections)) {
    mappedExercise.corrections = mappedExercise.corrections.filter((c) => c.isPublished === true);
  }
  return mappedExercise;
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
    const { subjectId, difficulty, courseId } = req.query;
    const page = Number.parseInt(String(req.query.page || ''), 10);
    const pageSize = Number.parseInt(String(req.query.pageSize || ''), 10);
    const shouldPaginate = Number.isFinite(page) || Number.isFinite(pageSize);
    const resolvedPage = Math.max(1, Number.isFinite(page) ? page : 1);
    const resolvedPageSize = Math.min(100, Math.max(1, Number.isFinite(pageSize) ? pageSize : 20));

    if (!req.user) {
      if (shouldPaginate) {
        return res.json({
          items: [],
          total: 0,
          page: resolvedPage,
          pageSize: resolvedPageSize,
        });
      }

      return res.json([]);
    }

    const visibilityWhere = await contentVisibilityWhere(req);
    const where = {
      ...visibilityWhere,
      ...(req.user.role === 'TEACHER' ? { isPublished: true } : {}),
      ...(subjectId && { subjectId }),
      ...(courseId && { courseId }),
      ...(difficulty && { difficulty }),
    };

    const query = {
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }, { title: 'asc' }],
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

    const isPrivileged = req.user && (req.user.role === 'ADMIN' || req.user.role === 'TEACHER');
    const mapped = exercises.map((ex) => {
      const mappedEx = mapExerciseFiles(ex);
      if (!isPrivileged) filterPublishedCorrectionsOnly(mappedEx);
      return mappedEx;
    });
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
    const visibilityWhere = await contentVisibilityWhere(req);
    const exercise = await prisma.exercise.findFirst({
      where: {
        id,
        ...visibilityWhere,
      },
      select: EXERCISE_LIST_SELECT,
    });
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });
    const isPrivileged = req.user && (req.user.role === 'ADMIN' || req.user.role === 'TEACHER');
    const mapped = mapExerciseFiles(exercise);
    if (!isPrivileged) filterPublishedCorrectionsOnly(mapped);
    res.json(mapped);
  } catch (error) {
    sendError(res, 500, 'Error fetching exercise', error);
  }
};

const buildExerciseData = (req) => {
  const {
    title,
    description,
    contentUrl,
    videoUrl,
    videoPath,
    contentText,
    externalLink,
    difficulty,
    subjectId,
    courseId,
    groupTitle,
    tags,
    isPublished,
    order,
    sections,
    teacherId,
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
  const normalizedVideoPath = videoPath ? normalizeStoredFileValueToKey(videoPath) : null;

  return {
    title,
    description,
    contentUrl: normalizedContentUrl,
    videoUrl: normalizeOptionalText(videoUrl),
    videoPath: normalizedVideoPath,
    contentText: normalizeOptionalText(contentText),
    externalLink: normalizeOptionalText(externalLink),
    advertisementImage: normalizedAdvertisementImage,
    advertisementTeacherName: normalizeOptionalText(advertisementTeacherName),
    advertisementSubject: normalizeOptionalText(advertisementSubject),
    advertisementWhatsapp: normalizeWhatsapp(advertisementWhatsapp),
    advertisementDescription: normalizeOptionalText(advertisementDescription),
    difficulty,
    subjectId,
    courseId: courseId || null,
    groupTitle: normalizeOptionalText(groupTitle),
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === 'string' && t.trim().length > 0) : [],
    isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    order: Number.isFinite(Number(order)) ? Number(order) : 0,
    sections: Array.isArray(sections) ? sections.filter(Boolean) : undefined,
    teacherId: teacherId || null,
  };
};

const validateUploads = async ({ contentUrl, advertisementImage, videoPath }) => {
  await Promise.all([
    contentUrl
      ? validateStoredUpload({
          storedValue: contentUrl,
          allowedMimeTypes: PDF_MIME_TYPES,
          maxSizeBytes: PDF_MAX_SIZE_BYTES,
        })
      : Promise.resolve(),
    advertisementImage
      ? validateStoredUpload({
          storedValue: advertisementImage,
          allowedMimeTypes: IMAGE_MIME_TYPES,
          maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
        })
      : Promise.resolve(),
    videoPath
      ? validateStoredUpload({
          storedValue: videoPath,
          allowedMimeTypes: VIDEO_MIME_TYPES,
          maxSizeBytes: VIDEO_MAX_SIZE_BYTES,
        })
      : Promise.resolve(),
  ]);
};

const assertExerciseWriteAccess = async (req, exerciseId) => {
  const isAdmin = req.user.role === 'ADMIN';
  if (isAdmin) {
    return {};
  }

  if (req.user.role !== 'TEACHER') {
    return { error: 'Forbidden', status: 403 };
  }

  if (exerciseId) {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, teacherId: true, createdById: true, subjectId: true,
        sectionAssignments: { select: { bacSection: true } } },
    });
    if (!exercise) {
      return { error: 'Exercise not found', status: 404 };
    }
    const owns = exercise.teacherId === req.user.id || exercise.createdById === req.user.id;
    if (!owns) {
      return { error: 'You can only edit your own exercises', status: 403 };
    }
    // Defense in depth: verify current scope still covers the existing subject + sections.
    const existingSections = exercise.sectionAssignments?.map((s) => s.bacSection) || [];
    const scopeCheck = await assertTeacherScope(req.user.id, {
      subjectId: exercise.subjectId,
      sections: existingSections,
    });
    if (!scopeCheck.ok) {
      return { error: scopeCheck.message, status: scopeCheck.status };
    }
  }

  return {};
};

const createExercise = async (req, res) => {
  try {
    const access = await assertExerciseWriteAccess(req, null);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const data = buildExerciseData(req);

    if (req.user.role === 'TEACHER') {
      const scopeCheck = await assertTeacherScope(req.user.id, {
        subjectId: data.subjectId,
        sections: data.sections,
      });
      if (!scopeCheck.ok) {
        return res.status(scopeCheck.status).json({ message: scopeCheck.message });
      }
      data.isPublished = false; // teacher content ALWAYS awaits admin moderation
      data.teacherId = req.user.id;
    }

    await validateUploads({
      contentUrl: data.contentUrl,
      advertisementImage: data.advertisementImage,
      videoPath: data.videoPath,
    });

    const resolvedSections = await resolveContentSections(data.subjectId, data.sections);

    const exercise = await prisma.exercise.create({
      data: {
        title: data.title,
        description: data.description,
        contentUrl: data.contentUrl,
        videoUrl: data.videoUrl,
        videoPath: data.videoPath,
        contentText: data.contentText,
        externalLink: data.externalLink,
        advertisementImage: data.advertisementImage,
        advertisementTeacherName: data.advertisementTeacherName,
        advertisementSubject: data.advertisementSubject,
        advertisementWhatsapp: data.advertisementWhatsapp,
        advertisementDescription: data.advertisementDescription,
        difficulty: data.difficulty,
        subjectId: data.subjectId,
        courseId: data.courseId,
        groupTitle: data.groupTitle,
        tags: data.tags,
        isPublished: data.isPublished,
        order: data.order,
        teacherId: data.teacherId,
        createdById: req.user.id,
        sectionAssignments: resolvedSections.length
          ? { create: resolvedSections.map((s) => ({ bacSection: s })) }
          : undefined,
      },
      include: { subject: true, sectionAssignments: { select: { bacSection: true } } },
    });
    res.status(201).json(mapExerciseFiles(exercise));
  } catch (error) {
    sendError(res, 500, 'Error creating exercise', error);
  }
};

const updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const access = await assertExerciseWriteAccess(req, id);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const data = buildExerciseData(req);

    if (req.user.role === 'TEACHER') {
      const scopeCheck = await assertTeacherScope(req.user.id, {
        subjectId: data.subjectId,
        sections: data.sections,
      });
      if (!scopeCheck.ok) {
        return res.status(scopeCheck.status).json({ message: scopeCheck.message });
      }
      data.isPublished = false; // teachers cannot self-publish
      data.teacherId = req.user.id;
    }

    await validateUploads({
      contentUrl: data.contentUrl,
      advertisementImage: data.advertisementImage,
      videoPath: data.videoPath,
    });

    const resolvedSections = data.sections !== undefined
      ? await resolveContentSections(data.subjectId, data.sections)
      : null;

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        contentUrl: data.contentUrl,
        videoUrl: data.videoUrl,
        videoPath: data.videoPath,
        contentText: data.contentText,
        externalLink: data.externalLink,
        advertisementImage: data.advertisementImage,
        advertisementTeacherName: data.advertisementTeacherName,
        advertisementSubject: data.advertisementSubject,
        advertisementWhatsapp: data.advertisementWhatsapp,
        advertisementDescription: data.advertisementDescription,
        difficulty: data.difficulty,
        subjectId: data.subjectId,
        courseId: data.courseId,
        groupTitle: data.groupTitle,
        tags: data.tags,
        isPublished: data.isPublished,
        order: data.order,
        teacherId: data.teacherId,
        ...(resolvedSections
          ? {
              sectionAssignments: {
                deleteMany: {},
                create: resolvedSections.map((s) => ({ bacSection: s })),
              },
            }
          : {}),
      },
      include: { subject: true, sectionAssignments: { select: { bacSection: true } } },
    });
    res.json(mapExerciseFiles(exercise));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    sendError(res, 500, 'Error updating exercise', error);
  }
};

const publishExercise = async (req, res) => {
  try {
    // Publish/unpublish is ADMIN ONLY. Teachers cannot self-publish.
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only an admin can publish or unpublish exercises' });
    }
    const { id } = req.params;
    const isPublished = req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : true;
    const exercise = await prisma.exercise.update({
      where: { id },
      data: { isPublished },
      include: { subject: true, sectionAssignments: { select: { bacSection: true } } },
    });
    res.json({
      message: isPublished ? 'Exercise published' : 'Exercise unpublished',
      exercise: mapExerciseFiles(exercise),
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    sendError(res, 500, 'Error updating exercise visibility', error);
  }
};

const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const access = await assertExerciseWriteAccess(req, id);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

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

const reorderExercises = async (req, res) => {
  try {
    const orderedItems = Array.isArray(req.body.orderedItems) ? req.body.orderedItems : [];
    if (orderedItems.length === 0) {
      return res.status(400).json({ message: 'orderedItems is required' });
    }

    await prisma.$transaction(
      orderedItems.map((item) =>
        prisma.exercise.update({
          where: { id: item.id },
          data: { order: Number(item.order) || 0 },
        })
      )
    );

    res.json({ message: 'Exercises reordered successfully' });
  } catch (error) {
    sendError(res, 500, 'Error reordering exercises', error);
  }
};

const mapCorrectionFiles = (correction) => {
  if (!correction) return correction;
  return {
    ...correction,
    contentUrl: correction.contentUrl ? toPublicUrlFromStoredValue(correction.contentUrl) : null,
    videoPath: correction.videoPath ? toPublicUrlFromStoredValue(correction.videoPath) : null,
  };
};

const buildCorrectionData = (req) => {
  const {
    title,
    description,
    contentText,
    videoUrl,
    videoPath,
    externalLink,
    difficulty,
    isPublished,
    order,
    contentUrl,
    teacherId,
  } = req.body;

  const normalizedContentUrl = contentUrl ? normalizeStoredFileValueToKey(contentUrl) : null;
  const normalizedVideoPath = videoPath ? normalizeStoredFileValueToKey(videoPath) : null;

  return {
    title,
    description: normalizeOptionalText(description),
    contentText: normalizeOptionalText(contentText),
    videoUrl: normalizeOptionalText(videoUrl),
    videoPath: normalizedVideoPath,
    externalLink: normalizeOptionalText(externalLink),
    difficulty,
    isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    order: Number.isFinite(Number(order)) ? Number(order) : 0,
    contentUrl: normalizedContentUrl,
    teacherId: teacherId || null,
  };
};

const validateCorrectionUploads = async ({ contentUrl, videoPath }) => {
  await Promise.all([
    contentUrl
      ? validateStoredUpload({
          storedValue: contentUrl,
          allowedMimeTypes: PDF_MIME_TYPES,
          maxSizeBytes: PDF_MAX_SIZE_BYTES,
        })
      : Promise.resolve(),
    videoPath
      ? validateStoredUpload({
          storedValue: videoPath,
          allowedMimeTypes: VIDEO_MIME_TYPES,
          maxSizeBytes: VIDEO_MAX_SIZE_BYTES,
        })
      : Promise.resolve(),
  ]);
};

const getCorrection = async (req, res) => {
  try {
    const { id: exerciseId, correctionId } = req.params;
    const visibilityWhere = await contentVisibilityWhere(req);
    const exercise = await prisma.exercise.findFirst({
      where: { id: exerciseId, ...visibilityWhere },
      select: { id: true },
    });
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const correction = await prisma.correction.findFirst({
      where: { id: correctionId, exerciseId },
      select: {
        id: true,
        title: true,
        description: true,
        contentText: true,
        videoUrl: true,
        videoPath: true,
        externalLink: true,
        difficulty: true,
        isPublished: true,
        order: true,
        contentUrl: true,
        exerciseId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!correction) return res.status(404).json({ message: 'Correction not found' });
    res.json(mapCorrectionFiles(correction));
  } catch (error) {
    sendError(res, 500, 'Error fetching correction', error);
  }
};

const upsertCorrection = async (req, res) => {
  try {
    const { id: exerciseId, correctionId } = req.params;
    const access = await assertExerciseWriteAccess(req, exerciseId);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, subjectId: true, teacherId: true, createdById: true,
        sectionAssignments: { select: { bacSection: true } } },
    });
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const data = buildCorrectionData(req);

    if (req.user.role === 'TEACHER') {
      const existingSections = exercise.sectionAssignments?.map((s) => s.bacSection) || [];
      const scopeCheck = await assertTeacherScope(req.user.id, {
        subjectId: exercise.subjectId,
        sections: existingSections,
      });
      if (!scopeCheck.ok) {
        return res.status(scopeCheck.status).json({ message: scopeCheck.message });
      }
      data.isPublished = false;
      data.teacherId = req.user.id;
    }

    await validateCorrectionUploads({
      contentUrl: data.contentUrl,
      videoPath: data.videoPath,
    });

    const existing = await prisma.correction.findUnique({
      where: { id: correctionId },
      select: { id: true, exerciseId: true, contentUrl: true, videoPath: true },
    });

    let correction;
    if (existing && existing.exerciseId === exerciseId) {
      correction = await prisma.correction.update({
        where: { id: correctionId },
        data: {
          title: data.title,
          description: data.description,
          contentText: data.contentText,
          videoUrl: data.videoUrl,
          videoPath: data.videoPath,
          externalLink: data.externalLink,
          difficulty: data.difficulty,
          isPublished: data.isPublished,
          order: data.order,
          contentUrl: data.contentUrl,
          teacherId: data.teacherId,
        },
      });
    } else {
      if (existing) {
        return res.status(400).json({ message: 'Correction belongs to another exercise' });
      }
      correction = await prisma.correction.create({
        data: {
          id: correctionId,
          title: data.title,
          description: data.description,
          contentText: data.contentText,
          videoUrl: data.videoUrl,
          videoPath: data.videoPath,
          externalLink: data.externalLink,
          difficulty: data.difficulty,
          isPublished: data.isPublished,
          order: data.order,
          contentUrl: data.contentUrl,
          teacherId: data.teacherId,
          createdById: req.user.id,
          exerciseId,
        },
      });
    }
    res.json(mapCorrectionFiles(correction));
  } catch (error) {
    sendError(res, 500, 'Error saving correction', error);
  }
};

const deleteCorrection = async (req, res) => {
  try {
    const { id: exerciseId, correctionId } = req.params;
    const access = await assertExerciseWriteAccess(req, exerciseId);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true },
    });
    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    const existing = await prisma.correction.findFirst({
      where: { id: correctionId, exerciseId },
      select: { id: true, contentUrl: true, videoPath: true },
    });
    if (!existing) return res.status(404).json({ message: 'Correction not found' });

    await prisma.correction.delete({ where: { id: correctionId } });

    const keys = [existing?.contentUrl, existing?.videoPath].filter(
      (value) => value && !/^https?:\/\//i.test(String(value))
    );
    await Promise.all(keys.map((key) => deleteObject(key)));

    res.json({ message: 'Correction deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Correction not found' });
    }
    sendError(res, 500, 'Error deleting correction', error);
  }
};

module.exports = {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  publishExercise,
  reorderExercises,
  getCorrection,
  upsertCorrection,
  deleteCorrection,
};
