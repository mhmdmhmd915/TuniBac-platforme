const prisma = require('../lib/prisma');
const { serializeAd } = require('./teacherAdController');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');
const { sanitizeUrl } = require('../utils/sanitizeHtml');
const { getTeacherScope } = require('../utils/learningPath');
const { normalizeStoredFileValueToKey, toPublicUrlFromStoredValue } = require('../lib/r2');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const { IMAGE_MAX_SIZE_BYTES, IMAGE_MIME_TYPES } = require('../utils/uploadPolicies');
const { resolveRequestedBacSection } = require('../utils/bacSection');

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const optionalString = (value) => {
  const normalized = cleanString(value);
  return normalized ? normalized : null;
};
const normalizeWhatsapp = (value) => {
  const digits = String(value || '').replace(/\D+/g, '');
  return digits || null;
};
const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

const serializeProfile = (profile) => ({
  ...profile,
  photo: profile.photo ? toPublicUrlFromStoredValue(profile.photo) : null,
});

const getMyProfile = async (req, res) => {
  try {
    const [profile, assignments, ownedCourses, ownedExercises] = await Promise.all([
      prisma.teacherProfile.findUnique({
        where: { teacherId: req.user.id },
      }),
      prisma.teacherAssignment.findMany({
        where: { teacherId: req.user.id },
        include: { subject: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.course.count({ where: { OR: [{ teacherId: req.user.id }, { createdById: req.user.id }] } }),
      prisma.exercise.count({ where: { OR: [{ teacherId: req.user.id }, { createdById: req.user.id }] } }),
    ]);

    res.json({
      profile: profile ? serializeProfile(profile) : null,
      assignments,
      contentCounts: { courses: ownedCourses, exercises: ownedExercises },
    });
  } catch (error) {
    logger.error('Error fetching teacher profile', error);
    sendError(res, 500, 'Error fetching teacher profile', error);
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const photo = req.body.photo ? normalizeStoredFileValueToKey(req.body.photo) : null;
    if (photo) {
      await validateStoredUpload({
        storedValue: photo,
        allowedMimeTypes: IMAGE_MIME_TYPES,
        maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
      });
    }

    const data = {
      photo,
      bio: optionalString(req.body.bio),
      whatsapp: normalizeWhatsapp(req.body.whatsapp),
      externalLink: sanitizeUrl(optionalString(req.body.externalLink)),
      isPublic: parseBoolean(req.body.isPublic, false),
    };

    const profile = await prisma.teacherProfile.upsert({
      where: { teacherId: req.user.id },
      create: { teacherId: req.user.id, ...data },
      update: data,
    });

    res.json({ message: 'Profile updated successfully', profile: serializeProfile(profile) });
  } catch (error) {
    logger.error('Error updating teacher profile', error);
    sendError(res, 500, 'Error updating teacher profile', error);
  }
};

const getMyContent = async (req, res) => {
  try {
    const [courses, exercises] = await Promise.all([
      prisma.course.findMany({
        where: { OR: [{ teacherId: req.user.id }, { createdById: req.user.id }] },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          isPublished: true,
          createdAt: true,
          sectionAssignments: { select: { bacSection: true } },
          subject: { select: { id: true, name: true, color: true } },
        },
      }),
      prisma.exercise.findMany({
        where: { OR: [{ teacherId: req.user.id }, { createdById: req.user.id }] },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          groupTitle: true,
          isPublished: true,
          createdAt: true,
          sectionAssignments: { select: { bacSection: true } },
          subject: { select: { id: true, name: true, color: true } },
        },
      }),
    ]);

    res.json({
      courses: courses.map((c) => ({ ...c, sections: c.sectionAssignments.map((s) => s.bacSection), sectionAssignments: undefined })),
      exercises: exercises.map((e) => ({ ...e, sections: e.sectionAssignments.map((s) => s.bacSection), sectionAssignments: undefined })),
    });
  } catch (error) {
    logger.error('Error fetching teacher content', error);
    sendError(res, 500, 'Error fetching teacher content', error);
  }
};

const getTeacherScopeInfo = async (req, res) => {
  try {
    const scope = await getTeacherScope(req.user.id);
    const subjectIds = scope.subjectIds;
    const subjects = subjectIds.length
      ? await prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true, color: true, icon: true, bacSection: true, subjectSections: { select: { bacSection: true } } },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        })
      : [];
    const allSubjects = await prisma.subject.findMany({
      where: { isActive: true },
      select: { id: true, name: true, color: true, icon: true, bacSection: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    res.json({ scope, subjects, allSubjects });
  } catch (error) {
    logger.error('Error fetching teacher scope', error);
    sendError(res, 500, 'Error fetching teacher scope', error);
  }
};

const listPublicTeachers = async (req, res) => {
  try {
    const limit = Math.min(50, Number.parseInt(String(req.query.limit || ''), 10) || 12);
    const filterSubjectId = optionalString(req.query.subjectId);
    const filterBacSection = resolveRequestedBacSection(req.query.bacSection);

    const users = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        status: 'APPROVED',
        teacherProfile: { isPublic: true },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        teacherProfile: true,
        teacherAssignments: {
          include: { subject: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: limit,
    });

    const result = users
      .filter((u) => u.teacherProfile)
      .filter((u) => {
        if (!filterSubjectId && !filterBacSection) {
          return true;
        }
        return u.teacherAssignments.some((a) => {
          const subjectMatch = !filterSubjectId || a.subjectId === filterSubjectId;
          const sectionMatch = !filterBacSection || a.bacSection === filterBacSection;
          if (filterSubjectId && filterBacSection) {
            return subjectMatch && sectionMatch;
          }
          return subjectMatch || sectionMatch;
        });
      })
      .map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profile: serializeProfile(user.teacherProfile),
        assignments: user.teacherAssignments,
      }));

    res.json({ teachers: result });
  } catch (error) {
    logger.error('Error listing public teachers', error);
    sendError(res, 500, 'Error listing public teachers', error);
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        teacherProfile: true,
        teacherAssignments: {
          include: { subject: { select: { id: true, name: true } } },
        },
      },
    });

    if (!user || user.role !== 'TEACHER' || user.status !== 'APPROVED') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (!user.teacherProfile?.isPublic) {
      return res.status(404).json({ message: 'Teacher profile is not public' });
    }

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const [courses, adsRows] = await Promise.all([
      prisma.course.findMany({
        where: { teacherId: user.id, isPublished: true },
        orderBy: [{ createdAt: 'desc' }],
        select: { id: true, title: true, description: true, difficulty: true, subject: { select: { name: true } } },
        take: 20,
      }),
      prisma.teacherAdvertisement.findMany({
        where: {
          isActive: true,
          isApproved: true,
          OR: [
            { teacherId: user.id },
            { teacherName: { equals: fullName, mode: 'insensitive' } },
            { teacherName: { contains: user.firstName || '', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      }),
    ]);

    const ads = adsRows.map(serializeAd);

    res.json({
      teacher: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profile: serializeProfile(user.teacherProfile),
        assignments: user.teacherAssignments.map((a) => ({
          subjectId: a.subjectId,
          subjectName: a.subject?.name || null,
          bacSection: a.bacSection,
        })),
      },
      courses,
      ads,
    });
  } catch (error) {
    logger.error('Error fetching public teacher profile', error);
    sendError(res, 500, 'Error fetching public teacher profile', error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getMyContent,
  getTeacherScopeInfo,
  listPublicTeachers,
  getPublicProfile,
};
