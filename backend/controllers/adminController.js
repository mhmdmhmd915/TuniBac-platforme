const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const { resolveRequestedBacSection } = require('../utils/bacSection');
const { sendError } = require('../utils/http');
const { deleteObject, normalizeStoredFileValueToKey, toPublicUrlFromStoredValue } = require('../lib/r2');
const { logger } = require('../utils/logger');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const { PDF_MAX_SIZE_BYTES, PDF_MIME_TYPES, RESOURCE_MAX_SIZE_BYTES, RESOURCE_MIME_TYPES } = require('../utils/uploadPolicies');
const { normalizeTunisianPhone } = require('../utils/tunisianPhone');

const ADMIN_USER_BASE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  bacSection: true,
  role: true,
  status: true,
  approvalDate: true,
  lastLogin: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
};

const ADMIN_USER_LIST_SELECT = {
  ...ADMIN_USER_BASE_SELECT,
  _count: {
    select: {
      enrollments: true,
      homeworks: true,
      studyTasks: true,
    },
  },
};

const ADMIN_USER_DETAIL_SELECT = {
  ...ADMIN_USER_BASE_SELECT,
  enrollments: true,
  homeworks: true,
  studyTasks: true,
};

const parsePagination = (query, defaultPageSize = 20, maxPageSize = 100) => {
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, Number.parseInt(String(query.pageSize || String(defaultPageSize)), 10) || defaultPageSize)
  );

  return { page, pageSize };
};

const revokeUserTokensData = {
  tokenVersion: {
    increment: 1,
  },
};

// User Management
const getAllUsers = async (req, res) => {
  try {
    const { search, status, role, sortBy, sortOrder } = req.query;
    const bacSection = resolveRequestedBacSection(req.query.bacSection);
    const { page, pageSize } = parsePagination(req.query);

    // Build where clause
    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (role) {
      where.role = role;
    }

    if (bacSection) {
      where.bacSection = bacSection;
    }

    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy =
      sortBy === 'name'
        ? [{ lastName: direction }, { firstName: direction }, { createdAt: 'desc' }]
        : [{ createdAt: direction }];

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: ADMIN_USER_LIST_SELECT,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (error) {
    logger.error('Error fetching users', error);
    sendError(res, 500, 'Error fetching users', error);
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: ADMIN_USER_DETAIL_SELECT,
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Error fetching user', error);
    sendError(res, 500, 'Error fetching user', error);
  }
};

const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvalDate: new Date()
      },
      select: ADMIN_USER_BASE_SELECT,
    });
    res.json({ message: 'User approved', user });
  } catch (error) {
    logger.error('Error approving user', error);
    sendError(res, 500, 'Error approving user', error);
  }
};

const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'REJECTED',
        ...revokeUserTokensData,
      },
      select: ADMIN_USER_BASE_SELECT,
    });
    res.json({ message: 'User rejected', user });
  } catch (error) {
    logger.error('Error rejecting user', error);
    sendError(res, 500, 'Error rejecting user', error);
  }
};

const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        ...revokeUserTokensData,
      },
      select: ADMIN_USER_BASE_SELECT,
    });
    res.json({ message: 'User suspended', user });
  } catch (error) {
    logger.error('Error suspending user', error);
    sendError(res, 500, 'Error suspending user', error);
  }
};

const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: {
        status: 'APPROVED',
        ...revokeUserTokensData,
      },
      select: ADMIN_USER_BASE_SELECT,
    });
    res.json({ message: 'User reactivated', user });
  } catch (error) {
    logger.error('Error reactivating user', error);
    sendError(res, 500, 'Error reactivating user', error);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, role } = req.body;
    const bacSection = resolveRequestedBacSection(req.body.bacSection);
    const normalizedPhone =
      typeof phone === 'string' && phone.trim() ? normalizeTunisianPhone(phone) : null;

    if (typeof phone === 'string' && phone.trim() && !normalizedPhone) {
      return res.status(400).json({ message: 'Invalid Tunisian mobile phone number' });
    }

    const data = {
      ...(typeof firstName === 'string' ? { firstName: firstName.trim() } : {}),
      ...(typeof lastName === 'string' ? { lastName: lastName.trim() } : {}),
      ...(typeof phone === 'string' ? { phone: normalizedPhone } : {}),
      ...(typeof role === 'string' ? { role } : {}),
      ...(bacSection ? { bacSection } : {}),
    };

    const user = await prisma.user.update({
      where: { id },
      data,
      select: ADMIN_USER_BASE_SELECT,
    });
    res.json({ message: 'User updated', user });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'Phone number already exists' });
    }
    logger.error('Error updating user', error);
    sendError(res, 500, 'Error updating user', error);
  }
};

const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        ...revokeUserTokensData,
      },
      select: { id: true, email: true, role: true, status: true },
    });

    res.json({ message: 'Password updated', user });
  } catch (error) {
    logger.error('Error updating user password', error);
    sendError(res, 500, 'Error updating user password', error);
  }
};

const bulkApproveUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    const users = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: {
        status: 'APPROVED',
        approvalDate: new Date()
      }
    });
    res.json({ message: 'Users approved', count: users.count });
  } catch (error) {
    logger.error('Error bulk approving users', error);
    sendError(res, 500, 'Error bulk approving users', error);
  }
};

const bulkSuspendUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    const users = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: {
        status: 'SUSPENDED',
        ...revokeUserTokensData,
      }
    });
    res.json({ message: 'Users suspended', count: users.count });
  } catch (error) {
    logger.error('Error bulk suspending users', error);
    sendError(res, 500, 'Error bulk suspending users', error);
  }
};

const bulkDeleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'userIds must be a non-empty array' });
    }

    await prisma.$transaction(
      userIds.flatMap((id) => [
        prisma.progressTracking.deleteMany({ where: { userId: id } }),
        prisma.enrollment.deleteMany({ where: { userId: id } }),
        prisma.studentPlannerTask.deleteMany({ where: { userId: id } }),
        prisma.studyTask.deleteMany({ where: { userId: id } }),
        prisma.homeworkSubmission.deleteMany({ where: { userId: id } }),
        prisma.user.delete({ where: { id } }),
      ])
    );

    res.json({ message: 'Users deleted', count: userIds.length });
  } catch (error) {
    logger.error('Error bulk deleting users', error);
    sendError(res, 500, 'Error bulk deleting users', error);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.$transaction([
      prisma.progressTracking.deleteMany({ where: { userId: id } }),
      prisma.enrollment.deleteMany({ where: { userId: id } }),
      prisma.studentPlannerTask.deleteMany({ where: { userId: id } }),
      prisma.studyTask.deleteMany({ where: { userId: id } }),
      prisma.homeworkSubmission.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Error deleting user', error);
    sendError(res, 500, 'Error deleting user', error);
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        role,
        ...(existingUser.role !== role ? revokeUserTokensData : {}),
      },
      select: ADMIN_USER_BASE_SELECT,
    });

    res.json(user);
  } catch (error) {
    logger.error('Error updating user role', error);
    sendError(res, 500, 'Error updating user', error);
  }
};

// Dashboard Stats
const getDashboardStats = async (req, res) => {
  try {
    const bacSection = resolveRequestedBacSection(req.query.bacSection);
    const userWhere = bacSection ? { bacSection } : {};
    const subjectWhere = bacSection ? { bacSection } : {};
    const courseWhere = bacSection ? { subject: { bacSection } } : {};
    const exerciseWhere = bacSection ? { subject: { bacSection } } : {};
    const submissionWhere = bacSection ? { bacSection } : {};
    const parascolaireWhere = bacSection ? { bacSection } : {};
    const [
      pendingUsers,
      approvedUsers,
      suspendedUsers,
      rejectedUsers,
      totalCourses,
      totalExercises,
      totalSubmissions,
      totalSubjects,
      totalParascolaires
    ] = await Promise.all([
      prisma.user.count({ where: { ...userWhere, status: 'PENDING' } }),
      prisma.user.count({ where: { ...userWhere, status: 'APPROVED' } }),
      prisma.user.count({ where: { ...userWhere, status: 'SUSPENDED' } }),
      prisma.user.count({ where: { ...userWhere, status: 'REJECTED' } }),
      prisma.course.count({ where: courseWhere }),
      prisma.exercise.count({ where: exerciseWhere }),
      prisma.homeworkSubmission.count({ where: submissionWhere }),
      prisma.subject.count({ where: subjectWhere }),
      prisma.parascolaire.count({ where: parascolaireWhere }),
    ]);

    const recentRegistrations = await prisma.user.findMany({
      where: userWhere,
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, bacSection: true, createdAt: true }
    });

    const recentApprovals = await prisma.user.findMany({
      where: { ...userWhere, status: 'APPROVED', approvalDate: { not: null } },
      take: 10,
      orderBy: { approvalDate: 'desc' },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, bacSection: true, approvalDate: true }
    });

    const recentSubmissions = await prisma.homeworkSubmission.findMany({
      where: submissionWhere,
      take: 10,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { submittedAt: 'desc' },
    });

    const recentCourses = await prisma.course.findMany({
      where: courseWhere,
      take: 5,
      include: { subject: true },
      orderBy: { createdAt: 'desc' },
    });

    const recentExercises = await prisma.exercise.findMany({
      where: exerciseWhere,
      take: 5,
      include: { subject: true },
      orderBy: { createdAt: 'desc' },
    });

    const recentParascolaires = await prisma.parascolaire.findMany({
      where: parascolaireWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const recentSubjects = await prisma.subject.findMany({
      where: subjectWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      pendingUsers,
      approvedUsers,
      suspendedUsers,
      rejectedUsers,
      totalCourses,
      totalExercises,
      totalSubmissions,
      totalSubjects,
      totalParascolaires,
      recentRegistrations,
      recentApprovals,
      recentSubmissions: recentSubmissions.map((submission) => ({
        ...submission,
        fileUrl: submission.fileUrl ? toPublicUrlFromStoredValue(submission.fileUrl) : null,
        correctionUrl: submission.correctionUrl ? toPublicUrlFromStoredValue(submission.correctionUrl) : null,
      })),
      recentCourses,
      recentExercises,
      recentParascolaires,
      recentSubjects,
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats', error);
    sendError(res, 500, 'Error fetching dashboard stats', error);
  }
};

const createExerciseCorrection = async (req, res) => {
  try {
    const { exerciseId, title } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No correction file uploaded' });
    }

    const storedContentUrl = String(req.file.storageKey || '');
    await validateStoredUpload({
      storedValue: storedContentUrl,
      allowedMimeTypes: PDF_MIME_TYPES,
      maxSizeBytes: PDF_MAX_SIZE_BYTES,
    });

    const correction = await prisma.correction.create({
      data: {
        title,
        contentUrl: storedContentUrl,
        exerciseId,
      },
    });

    res.json({
      ...correction,
      contentUrl: correction.contentUrl ? toPublicUrlFromStoredValue(correction.contentUrl) : null,
    });
  } catch (error) {
    sendError(res, 500, 'Error creating correction', error);
  }
};

const uploadSubmissionCorrection = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        message: 'No correction file uploaded',
      });
    }

    const storedCorrectionUrl = String(req.file.storageKey || '');
    await validateStoredUpload({
      storedValue: storedCorrectionUrl,
      allowedMimeTypes: PDF_MIME_TYPES,
      maxSizeBytes: PDF_MAX_SIZE_BYTES,
    });

    const submission = await prisma.homeworkSubmission.update({
      where: { id },
      data: {
        correctionUrl: storedCorrectionUrl,
        status: 'REVIEWED',
      },
    });

    res.json({
      ...submission,
      fileUrl: submission.fileUrl ? toPublicUrlFromStoredValue(submission.fileUrl) : null,
      correctionUrl: submission.correctionUrl ? toPublicUrlFromStoredValue(submission.correctionUrl) : null,
    });
  } catch (error) {
    sendError(res, 500, 'Error uploading correction', error);
  }
};

const addCourseResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url, type } = req.body;
    const normalizedUrl = url ? normalizeStoredFileValueToKey(url) : url;

    if (normalizedUrl && !/^https?:\/\//i.test(String(normalizedUrl))) {
      await validateStoredUpload({
        storedValue: normalizedUrl,
        allowedMimeTypes: RESOURCE_MIME_TYPES,
        maxSizeBytes: RESOURCE_MAX_SIZE_BYTES,
      });
    }

    const resource = await prisma.courseResource.create({
      data: {
        title,
        url: normalizedUrl,
        type,
        courseId: id,
      },
    });

    res.status(201).json({
      ...resource,
      url: resource.url ? toPublicUrlFromStoredValue(resource.url) : resource.url,
    });
  } catch (error) {
    sendError(res, 500, 'Error adding resource', error);
  }
};

const deleteCourseResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await prisma.courseResource.delete({
      where: { id },
    });

    if (resource?.url && !/^https?:\/\//i.test(resource.url)) {
      await deleteObject(resource.url);
    }

    res.json({
      message: 'Resource deleted',
    });
  } catch (error) {
    sendError(res, 500, 'Error deleting resource', error);
  }
};

const createCourseResource = async (req, res) => {
  try {
    const { title, url, type, courseId } = req.body;
    const normalizedUrl = url ? normalizeStoredFileValueToKey(url) : url;

    if (normalizedUrl && !/^https?:\/\//i.test(String(normalizedUrl))) {
      await validateStoredUpload({
        storedValue: normalizedUrl,
        allowedMimeTypes: RESOURCE_MIME_TYPES,
        maxSizeBytes: RESOURCE_MAX_SIZE_BYTES,
      });
    }

    const resource = await prisma.courseResource.create({
      data: {
        title,
        url: normalizedUrl,
        type,
        courseId,
      },
    });

    res.json({
      ...resource,
      url: resource.url ? toPublicUrlFromStoredValue(resource.url) : resource.url,
    });
  } catch (error) {
    sendError(res, 500, 'Error creating resource', error);
  }
};

const createExerciseResource = async (req, res) => {
  try {
    const { title, url, type, exerciseId } = req.body;
    const normalizedUrl = url ? normalizeStoredFileValueToKey(url) : url;

    if (normalizedUrl && !/^https?:\/\//i.test(String(normalizedUrl))) {
      await validateStoredUpload({
        storedValue: normalizedUrl,
        allowedMimeTypes: RESOURCE_MIME_TYPES,
        maxSizeBytes: RESOURCE_MAX_SIZE_BYTES,
      });
    }

    const resource = await prisma.exerciseResource.create({
      data: {
        title,
        url: normalizedUrl,
        type,
        exerciseId,
      },
    });

    res.json({
      ...resource,
      url: resource.url ? toPublicUrlFromStoredValue(resource.url) : resource.url,
    });
  } catch (error) {
    sendError(res, 500, 'Error creating resource', error);
  }
};

const deleteExerciseResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await prisma.exerciseResource.delete({
      where: { id },
    });

    if (resource?.url && !/^https?:\/\//i.test(resource.url)) {
      await deleteObject(resource.url);
    }

    res.json({ message: 'Exercise resource deleted' });
  } catch (error) {
    sendError(res, 500, 'Error deleting exercise resource', error);
  }
};

const deleteExerciseCorrection = async (req, res) => {
  try {
    const { id } = req.params;

    const correction = await prisma.correction.delete({
      where: { id },
    });

    if (correction?.contentUrl && !/^https?:\/\//i.test(correction.contentUrl)) {
      await deleteObject(correction.contentUrl);
    }

    res.json({ message: 'Exercise correction deleted' });
  } catch (error) {
    sendError(res, 500, 'Error deleting exercise correction', error);
  }
};

const getAllSubmissions = async (req, res) => {
  try {
    const bacSection = resolveRequestedBacSection(req.query.bacSection);
    const { page, pageSize } = parsePagination(req.query);
    const where = bacSection ? { bacSection } : undefined;
    const [total, items] = await Promise.all([
      prisma.homeworkSubmission.count({ where }),
      prisma.homeworkSubmission.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const mapped = items.map((submission) => ({
      ...submission,
      fileUrl: submission.fileUrl ? toPublicUrlFromStoredValue(submission.fileUrl) : null,
      correctionUrl: submission.correctionUrl ? toPublicUrlFromStoredValue(submission.correctionUrl) : null,
    }));

    res.json({
      items: mapped,
      submissions: mapped,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching submissions', error);
  }
};

const reviewSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback, grade } = req.body;

    const submission = await prisma.homeworkSubmission.update({
      where: { id },
      data: { status, feedback, grade },
    });
    res.json(submission);
  } catch (error) {
    logger.error('Error reviewing submission', error);
    sendError(res, 500, 'Error reviewing submission', error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  approveUser,
  rejectUser,
  suspendUser,
  reactivateUser,
  updateUser,
  updateUserPassword,
  bulkApproveUsers,
  bulkSuspendUsers,
  bulkDeleteUsers,
  getDashboardStats,
  uploadSubmissionCorrection,
  createCourseResource,
  addCourseResource,
  createExerciseCorrection,
  createExerciseResource,
  deleteExerciseCorrection,
  deleteExerciseResource,
  deleteCourseResource,
  getAllSubmissions,
  reviewSubmission,
};
