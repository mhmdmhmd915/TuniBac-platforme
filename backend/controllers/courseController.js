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

const COURSE_LIST_SELECT = {
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
  advertisementImage: true,
  advertisementTeacherName: true,
  advertisementSubject: true,
  advertisementWhatsapp: true,
  advertisementDescription: true,
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

const mapCourseFiles = (course) => {
  if (!course) return course;
  return {
    ...course,
    sections: (course.sectionAssignments || []).map((s) => s.bacSection),
    sectionAssignments: undefined,
    contentUrl: course.contentUrl ? toPublicUrlFromStoredValue(course.contentUrl) : null,
    videoPath: course.videoPath ? toPublicUrlFromStoredValue(course.videoPath) : null,
    advertisementImage: course.advertisementImage
      ? toPublicUrlFromStoredValue(course.advertisementImage)
      : null,
    resources: Array.isArray(course.resources)
      ? course.resources.map((resource) => ({
          ...resource,
          url: resource.url ? toPublicUrlFromStoredValue(resource.url) : resource.url,
        }))
      : course.resources,
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

const getAllCourses = async (req, res) => {
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
      select: COURSE_LIST_SELECT,
      ...(shouldPaginate
        ? {
            skip: (resolvedPage - 1) * resolvedPageSize,
            take: resolvedPageSize,
          }
        : {}),
    };

    const [courses, total] = await Promise.all([
      prisma.course.findMany(query),
      shouldPaginate ? prisma.course.count({ where }) : Promise.resolve(null),
    ]);

    const mapped = courses.map(mapCourseFiles);
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
    sendError(res, 500, 'Error fetching courses', error);
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const visibilityWhere = await contentVisibilityWhere(req);
    const course = await prisma.course.findFirst({
      where: {
        id,
        ...visibilityWhere,
      },
      select: COURSE_LIST_SELECT,
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(mapCourseFiles(course));
  } catch (error) {
    sendError(res, 500, 'Error fetching course', error);
  }
};

const buildCourseData = (req) => {
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
    advertisementImage,
    advertisementTeacherName,
    advertisementSubject,
    advertisementWhatsapp,
    advertisementDescription,
  } = req.body;

  const normalizedContentUrl = contentUrl ? normalizeStoredFileValueToKey(contentUrl) : null;
  const normalizedVideoPath = videoPath ? normalizeStoredFileValueToKey(videoPath) : null;
  const normalizedAdvertisementImage = advertisementImage
    ? normalizeStoredFileValueToKey(advertisementImage)
    : null;

  return {
    title,
    description,
    contentUrl: normalizedContentUrl,
    videoUrl,
    videoPath: normalizedVideoPath,
    contentText: normalizeOptionalText(contentText),
    externalLink: normalizeOptionalText(externalLink),
    advertisementImage: normalizedAdvertisementImage,
    advertisementTeacherName: normalizeOptionalText(advertisementTeacherName),
    advertisementSubject: normalizeOptionalText(advertisementSubject),
    advertisementWhatsapp: normalizeWhatsapp(advertisementWhatsapp),
    advertisementDescription: normalizeOptionalText(advertisementDescription),
    difficulty,
    tags,
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
  advertisementImage,
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
    advertisementImage
      ? validateStoredUpload({
          storedValue: advertisementImage,
          allowedMimeTypes: IMAGE_MIME_TYPES,
          maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
        })
      : Promise.resolve(),
  ]);
};

const assertCourseWriteAccess = async (req, courseId) => {
  const isAdmin = req.user.role === 'ADMIN';
  if (isAdmin) {
    return {};
  }

  if (req.user.role !== 'TEACHER') {
    return { error: 'Forbidden', status: 403 };
  }

  if (courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true, createdById: true, subjectId: true,
        sectionAssignments: { select: { bacSection: true } } },
    });
    if (!course) {
      return { error: 'Course not found', status: 404 };
    }
    const owns = course.teacherId === req.user.id || course.createdById === req.user.id;
    if (!owns) {
      return { error: 'You can only edit your own courses', status: 403 };
    }
    // Defense in depth: even for owned content, verify it still lies within the
    // teacher's current assigned scope (subject + sections) so Admin can revoke access.
    const existingSections = course.sectionAssignments?.map((s) => s.bacSection) || [];
    const scopeCheck = await assertTeacherScope(req.user.id, {
      subjectId: course.subjectId,
      sections: existingSections,
    });
    if (!scopeCheck.ok) {
      return { error: scopeCheck.message, status: scopeCheck.status };
    }
  }

  return {};
};

const createCourse = async (req, res) => {
  try {
    const access = await assertCourseWriteAccess(req, null);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const data = buildCourseData(req);

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
      data.createdById = req.user.id;
    } else if (req.user.role === 'ADMIN' && data.teacherId) {
      data.createdById = data.teacherId;
    }

    await validateUploads({
      contentUrl: data.contentUrl,
      videoPath: data.videoPath,
      advertisementImage: data.advertisementImage,
    });

    const resolvedSections = await resolveContentSections(data.subjectId, data.sections);

    const course = await prisma.course.create({
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
    res.status(201).json(mapCourseFiles(course));
  } catch (error) {
    sendError(res, 500, 'Error creating course', error);
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const access = await assertCourseWriteAccess(req, id);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const data = buildCourseData(req);

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
      videoPath: data.videoPath,
      advertisementImage: data.advertisementImage,
    });

    const resolvedSections = data.sections !== undefined
      ? await resolveContentSections(data.subjectId, data.sections)
      : null;

    const course = await prisma.course.update({
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
    res.json(mapCourseFiles(course));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Course not found' });
    }
    sendError(res, 500, 'Error updating course', error);
  }
};

const publishCourse = async (req, res) => {
  try {
    // Publish/unpublish is ADMIN ONLY. Teachers cannot self-publish.
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Only an admin can publish or unpublish courses' });
    }
    const { id } = req.params;
    const isPublished = req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : true;
    const course = await prisma.course.update({
      where: { id },
      data: { isPublished },
      include: { subject: true, sectionAssignments: { select: { bacSection: true } } },
    });
    res.json({ message: isPublished ? 'Course published' : 'Course unpublished', course: mapCourseFiles(course) });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Course not found' });
    }
    sendError(res, 500, 'Error updating course visibility', error);
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const access = await assertCourseWriteAccess(req, id);
    if (access.error) {
      return res.status(access.status).json({ message: access.error });
    }

    const existing = await prisma.course.findUnique({
      where: { id },
      select: {
        contentUrl: true,
        videoPath: true,
        advertisementImage: true,
        resources: { select: { url: true } },
      },
    });
    await prisma.$transaction([
      prisma.courseResource.deleteMany({ where: { courseId: id } }),
      prisma.course.delete({ where: { id } }),
    ]);
    const keys = [
      existing?.contentUrl,
      existing?.videoPath,
      existing?.advertisementImage,
      ...(existing?.resources || []).map((r) => r.url),
    ].filter((value) => value && !/^https?:\/\//i.test(String(value)));
    await Promise.all(keys.map((key) => deleteObject(key)));
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Course not found' });
    }
    sendError(res, 500, 'Error deleting course', error);
  }
};

const reorderCourses = async (req, res) => {
  try {
    const orderedItems = Array.isArray(req.body.orderedItems) ? req.body.orderedItems : [];
    if (orderedItems.length === 0) {
      return res.status(400).json({ message: 'orderedItems is required' });
    }

    await prisma.$transaction(
      orderedItems.map((item) =>
        prisma.course.update({
          where: { id: item.id },
          data: { order: Number(item.order) || 0 },
        })
      )
    );

    res.json({ message: 'Courses reordered successfully' });
  } catch (error) {
    sendError(res, 500, 'Error reordering courses', error);
  }
};

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse, publishCourse, reorderCourses };
