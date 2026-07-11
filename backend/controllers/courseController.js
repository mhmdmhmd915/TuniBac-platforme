const { withSectionFilter } = require('../utils/bacSection');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { deleteObject, normalizeStoredFileValueToKey, toPublicUrlFromStoredValue } = require('../lib/r2');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const { PDF_MAX_SIZE_BYTES, PDF_MIME_TYPES, VIDEO_MAX_SIZE_BYTES, VIDEO_MIME_TYPES } = require('../utils/uploadPolicies');

const COURSE_LIST_SELECT = {
  id: true,
  title: true,
  description: true,
  contentUrl: true,
  videoUrl: true,
  videoPath: true,
  difficulty: true,
  tags: true,
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
    contentUrl: course.contentUrl ? toPublicUrlFromStoredValue(course.contentUrl) : null,
    videoPath: course.videoPath ? toPublicUrlFromStoredValue(course.videoPath) : null,
    resources: Array.isArray(course.resources)
      ? course.resources.map((resource) => ({
          ...resource,
          url: resource.url ? toPublicUrlFromStoredValue(resource.url) : resource.url,
        }))
      : course.resources,
  };
};

const getAllCourses = async (req, res) => {
  try {
    const { subjectId, search } = req.query;
    const page = Number.parseInt(String(req.query.page || ''), 10);
    const pageSize = Number.parseInt(String(req.query.pageSize || ''), 10);
    const shouldPaginate = Number.isFinite(page) || Number.isFinite(pageSize);
    const resolvedPage = Math.max(1, Number.isFinite(page) ? page : 1);
    const resolvedPageSize = Math.min(100, Math.max(1, Number.isFinite(pageSize) ? pageSize : 20));

    const where = {
      ...withSectionFilter(req, 'subject.bacSection'),
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
      orderBy: [{ createdAt: 'desc' }, { title: 'asc' }],
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
    const course = await prisma.course.findFirst({
      where: {
        id,
        ...withSectionFilter(req, 'subject.bacSection'),
      },
      select: COURSE_LIST_SELECT,
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(mapCourseFiles(course));
  } catch (error) {
    sendError(res, 500, 'Error fetching course', error);
  }
};

const createCourse = async (req, res) => {
  try {
    const { title, description, contentUrl, videoUrl, videoPath, difficulty, tags, subjectId } = req.body;
    const normalizedContentUrl = contentUrl ? normalizeStoredFileValueToKey(contentUrl) : null;
    const normalizedVideoPath = videoPath ? normalizeStoredFileValueToKey(videoPath) : null;

    await Promise.all([
      normalizedContentUrl
        ? validateStoredUpload({
            storedValue: normalizedContentUrl,
            allowedMimeTypes: PDF_MIME_TYPES,
            maxSizeBytes: PDF_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
      normalizedVideoPath
        ? validateStoredUpload({
            storedValue: normalizedVideoPath,
            allowedMimeTypes: VIDEO_MIME_TYPES,
            maxSizeBytes: VIDEO_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
    ]);
    
    const course = await prisma.course.create({
      data: {
        title,
        description,
        contentUrl: normalizedContentUrl,
        videoUrl,
        videoPath: normalizedVideoPath,
        difficulty,
        tags,
        subjectId,
      },
      include: { subject: true },
    });
    res.status(201).json(mapCourseFiles(course));
  } catch (error) {
    sendError(res, 500, 'Error creating course', error);
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, contentUrl, videoUrl, videoPath, difficulty, tags, subjectId } = req.body;
    const normalizedContentUrl = contentUrl ? normalizeStoredFileValueToKey(contentUrl) : null;
    const normalizedVideoPath = videoPath ? normalizeStoredFileValueToKey(videoPath) : null;

    await Promise.all([
      normalizedContentUrl
        ? validateStoredUpload({
            storedValue: normalizedContentUrl,
            allowedMimeTypes: PDF_MIME_TYPES,
            maxSizeBytes: PDF_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
      normalizedVideoPath
        ? validateStoredUpload({
            storedValue: normalizedVideoPath,
            allowedMimeTypes: VIDEO_MIME_TYPES,
            maxSizeBytes: VIDEO_MAX_SIZE_BYTES,
          })
        : Promise.resolve(),
    ]);
    
    const course = await prisma.course.update({
      where: { id },
      data: {
        title,
        description,
        contentUrl: normalizedContentUrl,
        videoUrl,
        videoPath: normalizedVideoPath,
        difficulty,
        tags,
        subjectId,
      },
      include: { subject: true },
    });
    res.json(mapCourseFiles(course));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Course not found' });
    }
    sendError(res, 500, 'Error updating course', error);
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.course.findUnique({
      where: { id },
      select: {
        contentUrl: true,
        videoPath: true,
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

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse };
