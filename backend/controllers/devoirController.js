const { contentVisibilityWhere } = require('../utils/bacSection');
const { getTeacherScope, teacherCanManageSubject, resolveContentSections, assertTeacherScope } = require('../utils/learningPath');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { deleteObject, normalizeStoredFileValueToKey, toPublicUrlFromStoredValue } = require('../lib/r2');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const {
  PDF_MAX_SIZE_BYTES,
  PDF_MIME_TYPES,
  VIDEO_MAX_SIZE_BYTES,
  VIDEO_MIME_TYPES,
} = require('../utils/uploadPolicies');

const DEVOIR_LIST_SELECT = {
  id: true,
  title: true,
  description: true,
  contentUrl: true,
  videoUrl: true,
  videoPath: true,
  contentText: true,
  externalLink: true,
  isPublished: true,
  order: true,
  teacherId: true,
  difficulty: true,
  tags: true,
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
  teacher: {
    select: { id: true, firstName: true, lastName: true },
  },
  resources: {
    select: {
      id: true,
      title: true,
      url: true,
      type: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
};

const mapDevoirFiles = (devoir) => {
  if (!devoir) return devoir;
  return {
    ...devoir,
    sections: (devoir.sectionAssignments || []).map((s) => s.bacSection),
    sectionAssignments: undefined,
    contentUrl: devoir.contentUrl ? toPublicUrlFromStoredValue(devoir.contentUrl) : null,
    videoPath: devoir.videoPath ? toPublicUrlFromStoredValue(devoir.videoPath) : null,
    resources: Array.isArray(devoir.resources)
      ? devoir.resources.map((resource) => ({
          ...resource,
          url: resource.url ? toPublicUrlFromStoredValue(resource.url) : resource.url,
        }))
      : devoir.resources,
  };
};

const normalizeOptionalText = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const getAllDevoirs = async (req, res) => {
  try {
    const { subjectId, search } = req.query;
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
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      }),
    };

    const query = {
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }, { title: 'asc' }],
      select: DEVOIR_LIST_SELECT,
      ...(shouldPaginate
        ? {
            skip: (resolvedPage - 1) * resolvedPageSize,
            take: resolvedPageSize,
          }
        : {}),
    };

    const [devoirs, total] = await Promise.all([
      prisma.devoir.findMany(query),
      shouldPaginate ? prisma.devoir.count({ where }) : Promise.resolve(null),
    ]);

    const mapped = devoirs.map(mapDevoirFiles);
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
    sendError(res, 500, 'Error fetching devoirs', error);
  }
};

const getDevoirById = async (req, res) => {
  try {
    const { id } = req.params;
    const visibilityWhere = await contentVisibilityWhere(req);
    const devoir = await prisma.devoir.findFirst({
      where: {
        id,
        ...visibilityWhere,
      },
      select: DEVOIR_LIST_SELECT,
    });
    if (!devoir) return res.status(404).json({ message: 'Devoir not found' });
    res.json(mapDevoirFiles(devoir));
  } catch (error) {
    sendError(res, 500, 'Error fetching devoir', error);
  }
};

const buildDevoirData = (req) => {
  const {
    title,
    description,
    contentUrl,
    videoUrl,
    videoPath,
    contentText,
    externalLink,
    difficulty,
    tags,
    subjectId,
    isPublished,
    order,
    sections,
    teacherId,
  } = req.body;

  const normalizedContentUrl = contentUrl ? normalizeStoredFileValueToKey(contentUrl) : null;
  const normalizedVideoPath = videoPath ? normalizeStoredFileValueToKey(videoPath) : null;

  return {
    title,
    description: normalizeOptionalText(description),
    contentUrl: normalizedContentUrl,
    videoUrl: normalizeOptionalText(videoUrl),
    videoPath: normalizedVideoPath,
    contentText: normalizeOptionalText(contentText),
    externalLink: normalizeOptionalText(externalLink),
    difficulty,
    tags: Array.isArray(tags) ? tags : [],
    subjectId,
    isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    order: Number.isFinite(Number(order)) ? Number(order) : 0,
    sections: Array.isArray(sections) ? sections.filter(Boolean) : undefined,
    teacherId: teacherId || null,
  };
};

const validateUploads = async ({
  contentUrl,
  videoPath,
}) => {
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

const assertDevoirWriteAccess = async (req, devoirId) => {
  const isAdmin = req.user.role === 'ADMIN';
  if (isAdmin) {
    return {};
  }

  if (req.user.role !== 'TEACHER') {
    return { error: 'Forbidden', status: 403 };
  }

  if (devoirId) {
    const devoir = await prisma.devoir.findUnique({
      where: { id: devoirId },
      select: { id: true, teacherId: true, createdById: true, subjectId: true,
        sectionAssignments: { select: { bacSection: true } } },
    });
    if (!devoir) {
      return { error: 'Devoir not found', status: 404 };
    }
    const owns = devoir.teacherId === req.user.id || devoir.createdById === req.user.id;
    if (!owns) {
      return { error: 'You can only edit your own devoirs', status: 403 };
    }
    const existingSections = devoir.sectionAssignments?.map((s) => s.bacSection) || [];
    const scopeCheck = await assertTeacherScope(req.user.id, {
      subjectId: devoir.subjectId,
      sections: existingSections,
    });
    if (!scopeCheck.ok) {
      return { error: scopeCheck.message, status: scopeCheck.status };
    }
  }

  return {};
};

const createDevoir = async (req, res) => {
  try {
    const access = await assertDevoirWriteAccess(req, null);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const data = buildDevoirData(req);

    if (req.user.role === 'TEACHER') {
      const scopeCheck = await assertTeacherScope(req.user.id, {
        subjectId: data.subjectId,
        sections: data.sections,
      });
      if (!scopeCheck.ok) {
        return res.status(scopeCheck.status).json({ message: scopeCheck.message });
      }
      data.isPublished = false;
      data.teacherId = req.user.id;
      data.createdById = req.user.id;
    } else if (req.user.role === 'ADMIN' && data.teacherId) {
      data.createdById = data.teacherId;
    }

    await validateUploads({
      contentUrl: data.contentUrl,
      videoPath: data.videoPath,
    });

    const resolvedSections = await resolveContentSections(data.subjectId, data.sections);

    const devoir = await prisma.devoir.create({
      data: {
        title: data.title,
        description: data.description,
        contentUrl: data.contentUrl,
        videoUrl: data.videoUrl,
        videoPath: data.videoPath,
        contentText: data.contentText,
        externalLink: data.externalLink,
        difficulty: data.difficulty,
        tags: data.tags,
        isPublished: data.isPublished,
        order: data.order,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        createdById: req.user.role === 'ADMIN' ? data.createdById : req.user.id,
        sectionAssignments: resolvedSections.length
          ? { create: resolvedSections.map((s) => ({ bacSection: s })) }
          : undefined,
      },
      include: { subject: true, sectionAssignments: { select: { bacSection: true } } },
    });
    res.status(201).json(mapDevoirFiles(devoir));
  } catch (error) {
    sendError(res, 500, 'Error creating devoir', error);
  }
};

const updateDevoir = async (req, res) => {
  try {
    const { id } = req.params;
    const access = await assertDevoirWriteAccess(req, id);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const data = buildDevoirData(req);

    if (req.user.role === 'TEACHER') {
      const scopeCheck = await assertTeacherScope(req.user.id, {
        subjectId: data.subjectId,
        sections: data.sections,
      });
      if (!scopeCheck.ok) {
        return res.status(scopeCheck.status).json({ message: scopeCheck.message });
      }
      data.isPublished = false;
      data.teacherId = req.user.id;
    }

    await validateUploads({
      contentUrl: data.contentUrl,
      videoPath: data.videoPath,
    });

    const resolvedSections = data.sections !== undefined
      ? await resolveContentSections(data.subjectId, data.sections)
      : null;

    const devoir = await prisma.devoir.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        contentUrl: data.contentUrl,
        videoUrl: data.videoUrl,
        videoPath: data.videoPath,
        contentText: data.contentText,
        externalLink: data.externalLink,
        difficulty: data.difficulty,
        tags: data.tags,
        isPublished: data.isPublished,
        order: data.order,
        subjectId: data.subjectId,
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
    res.json(mapDevoirFiles(devoir));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Devoir not found' });
    }
    sendError(res, 500, 'Error updating devoir', error);
  }
};

const publishDevoir = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only an admin can publish or unpublish devoirs' });
    }
    const { id } = req.params;
    const isPublished = req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : true;
    const devoir = await prisma.devoir.update({
      where: { id },
      data: { isPublished },
      include: { subject: true, sectionAssignments: { select: { bacSection: true } } },
    });
    res.json({ message: isPublished ? 'Devoir published' : 'Devoir unpublished', devoir: mapDevoirFiles(devoir) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Devoir not found' });
    }
    sendError(res, 500, 'Error updating devoir visibility', error);
  }
};

const deleteDevoir = async (req, res) => {
  try {
    const { id } = req.params;
    const access = await assertDevoirWriteAccess(req, id);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const existing = await prisma.devoir.findUnique({
      where: { id },
      select: {
        contentUrl: true,
        videoPath: true,
        resources: { select: { url: true } },
      },
    });
    await prisma.$transaction([
      prisma.devoirResource.deleteMany({ where: { devoirId: id } }),
      prisma.devoirSectionAssignment.deleteMany({ where: { devoirId: id } }),
      prisma.devoir.delete({ where: { id } }),
    ]);
    const keys = [
      existing?.contentUrl,
      existing?.videoPath,
      ...(existing?.resources || []).map((r) => r.url),
    ].filter((value) => value && !/^https?:\/\//i.test(String(value)));
    await Promise.all(keys.map((key) => deleteObject(key)));
    res.json({ message: 'Devoir deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Devoir not found' });
    }
    sendError(res, 500, 'Error deleting devoir', error);
  }
};

const reorderDevoirs = async (req, res) => {
  try {
    const orderedItems = Array.isArray(req.body.orderedItems) ? req.body.orderedItems : [];
    if (orderedItems.length === 0) {
      return res.status(400).json({ message: 'orderedItems is required' });
    }

    await prisma.$transaction(
      orderedItems.map((item) =>
        prisma.devoir.update({
          where: { id: item.id },
          data: { order: Number(item.order) || 0 },
        })
      )
    );

    res.json({ message: 'Devoirs reordered successfully' });
  } catch (error) {
    sendError(res, 500, 'Error reordering devoirs', error);
  }
};

module.exports = { getAllDevoirs, getDevoirById, createDevoir, updateDevoir, deleteDevoir, publishDevoir, reorderDevoirs };
