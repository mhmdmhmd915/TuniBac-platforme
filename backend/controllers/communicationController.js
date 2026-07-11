const {
  BacSection,
  CommunicationAudience,
  CommunicationPriority,
  CommunicationStatus,
  CommunicationType,
} = require('../generated/prisma');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { deleteObject, normalizeStoredFileValueToKey, toPublicUrlFromStoredValue } = require('../lib/r2');
const { logger } = require('../utils/logger');
const {
  DEFAULT_BAC_SECTION,
  resolveRequestedBacSection,
} = require('../utils/bacSection');
const { sanitizeRichHtml, sanitizeUrl } = require('../utils/sanitizeHtml');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const { IMAGE_MAX_SIZE_BYTES, IMAGE_MIME_TYPES, PDF_MAX_SIZE_BYTES, PDF_MIME_TYPES, VIDEO_MAX_SIZE_BYTES, VIDEO_MIME_TYPES } = require('../utils/uploadPolicies');

const PRIORITY_RANK = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

const VALID_TYPES = new Set(Object.values(CommunicationType));
const VALID_PRIORITIES = new Set(Object.values(CommunicationPriority));
const VALID_STATUSES = new Set(Object.values(CommunicationStatus));
const VALID_AUDIENCES = new Set(Object.values(CommunicationAudience));
const VALID_BAC_SECTIONS = new Set(Object.values(BacSection));

const ADMIN_INCLUDE = {
  attachments: {
    orderBy: [{ createdAt: 'asc' }],
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

const cleanString = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const optionalString = (value) => {
  const normalized = cleanString(value);
  return normalized ? normalized : null;
};

const parseBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  return fallback;
};

const parseDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
};

const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeAttachment = (attachment) => {
  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  const kind = cleanString(attachment.kind).toUpperCase();
  const filePath = optionalString(attachment.filePath);
  const url = optionalString(attachment.url);

  if (!kind || (!filePath && !url)) {
    return null;
  }

  const sizeValue = attachment.sizeBytes;
  const parsedSize = Number.isFinite(Number(sizeValue)) ? Number(sizeValue) : null;

  return {
    kind,
    label: optionalString(attachment.label),
    filePath: filePath ? normalizeStoredFileValueToKey(filePath) : null,
    url: url ? sanitizeUrl(url) : null,
    mimeType: optionalString(attachment.mimeType),
    sizeBytes: parsedSize,
  };
};

const normalizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.map(normalizeAttachment).filter(Boolean);
};

const ATTACHMENT_VALIDATION_RULES = {
  IMAGE: {
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
  },
  PDF: {
    allowedMimeTypes: PDF_MIME_TYPES,
    maxSizeBytes: PDF_MAX_SIZE_BYTES,
  },
  VIDEO: {
    allowedMimeTypes: VIDEO_MIME_TYPES,
    maxSizeBytes: VIDEO_MAX_SIZE_BYTES,
  },
};

const validateCommunicationAttachments = async (attachments) => {
  await Promise.all(
    (attachments || []).map(async (attachment) => {
      const filePath = attachment?.filePath;
      if (!filePath || /^https?:\/\//i.test(String(filePath))) {
        return;
      }

      const validation = ATTACHMENT_VALIDATION_RULES[String(attachment.kind || '').toUpperCase()];
      if (!validation) {
        return;
      }

      await validateStoredUpload({
        storedValue: filePath,
        allowedMimeTypes: validation.allowedMimeTypes,
        maxSizeBytes: validation.maxSizeBytes,
        expectedMimeType: attachment.mimeType,
        originalFilename: attachment.label,
      });
    })
  );
};

const deriveLifecycleStatus = (communication) => {
  if (communication.status === 'ARCHIVED') {
    return 'ARCHIVED';
  }

  if (communication.status === 'DRAFT') {
    return 'DRAFT';
  }

  const now = new Date();
  if (communication.publishAt && new Date(communication.publishAt) > now) {
    return 'SCHEDULED';
  }

  if (communication.expireAt && new Date(communication.expireAt) <= now) {
    return 'EXPIRED';
  }

  return communication.status;
};

const serializeCommunication = (communication) => {
  const publishedReference = communication.publishAt || communication.createdAt;
  const isNew =
    new Date().getTime() - new Date(publishedReference).getTime() <= 24 * 60 * 60 * 1000;
  const attachments = Array.isArray(communication.attachments)
    ? communication.attachments.map((attachment) => ({
        ...attachment,
        filePath: attachment.filePath ? toPublicUrlFromStoredValue(attachment.filePath) : null,
      }))
    : [];
  const featuredAttachment =
    attachments.find((attachment) => attachment.kind === 'IMAGE') ||
    attachments.find((attachment) => attachment.kind === 'VIDEO') ||
    attachments.find((attachment) => attachment.kind === 'PDF') ||
    null;

  return {
    ...communication,
    attachments,
    excerpt: communication.description || stripHtml(communication.contentHtml).slice(0, 220),
    lifecycleStatus: deriveLifecycleStatus(communication),
    isNew,
    featuredAttachment,
  };
};

const buildPayload = (body, createdById) => {
  const title = cleanString(body.title);

  if (!title) {
    return { error: 'Title is required' };
  }

  const rawContentHtml = body.contentHtml == null ? '' : String(body.contentHtml);
  const contentHtml = sanitizeRichHtml(rawContentHtml);

  if (!rawContentHtml.trim()) {
    return { error: 'Content is required' };
  }

  if (!stripHtml(contentHtml)) {
    return { error: 'Content is required' };
  }

  const type = cleanString(body.type).toUpperCase() || 'GENERAL_INFORMATION';
  const priority = cleanString(body.priority).toUpperCase() || 'MEDIUM';
  const rawStatus = cleanString(body.status).toUpperCase();
  const status = rawStatus || 'DRAFT';
  const audience = cleanString(body.audience).toUpperCase() || 'ALL_STUDENTS';
  const bacSection = resolveRequestedBacSection(body.bacSection) || DEFAULT_BAC_SECTION;

  const publishAt = parseDate(body.publishAt);
  const expireAt = parseDate(body.expireAt);

  if (!VALID_TYPES.has(type)) {
    return { error: 'Invalid communication type' };
  }

  if (!VALID_PRIORITIES.has(priority)) {
    return { error: 'Invalid communication priority' };
  }

  if (!VALID_STATUSES.has(status)) {
    return { error: `Invalid status "${rawStatus}". Must be one of: DRAFT, PUBLISHED, ARCHIVED` };
  }

  if (!VALID_AUDIENCES.has(audience)) {
    return { error: 'Invalid communication audience' };
  }

  if (!VALID_BAC_SECTIONS.has(bacSection)) {
    return { error: 'Invalid Bac Section' };
  }

  if (publishAt === undefined) {
    return { error: 'Invalid publish date' };
  }

  if (expireAt === undefined) {
    return { error: 'Invalid expiration date' };
  }

  if (expireAt != null && publishAt != null && expireAt <= publishAt) {
    return { error: 'Expiration date must be after publish date' };
  }

  return {
    data: {
      type,
      priority,
      priorityRank: PRIORITY_RANK[priority],
      status,
      isVisible: parseBoolean(body.isVisible, true),
      audience,
      bacSection,
      title,
      description: optionalString(body.description),
      contentHtml,
      externalLink: sanitizeUrl(optionalString(body.externalLink)),
      meetingLink: sanitizeUrl(optionalString(body.meetingLink)),
      buttonText: optionalString(body.buttonText),
      buttonUrl: sanitizeUrl(optionalString(body.buttonUrl)),
      publishAt,
      expireAt,
      createdById: createdById || null,
    },
    attachments: normalizeAttachments(body.attachments),
  };
};

const buildAdminWhere = (query) => {
  const where = {};
  const search = cleanString(query.search);
  const type = cleanString(query.type).toUpperCase();
  const priority = cleanString(query.priority).toUpperCase();
  const status = cleanString(query.status).toUpperCase();
  const visibility = cleanString(query.visibility).toLowerCase();
  const fromDate = parseDate(query.fromDate);
  const toDate = parseDate(query.toDate);
  const bacSection = resolveRequestedBacSection(query.bacSection);

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { contentHtml: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (VALID_TYPES.has(type)) {
    where.type = type;
  }

  if (VALID_PRIORITIES.has(priority)) {
    where.priority = priority;
  }

  if (status === 'SCHEDULED') {
    where.status = 'PUBLISHED';
    where.publishAt = { gt: new Date() };
  } else if (VALID_STATUSES.has(status)) {
    where.status = status;
  }

  if (visibility === 'visible') {
    where.isVisible = true;
  } else if (visibility === 'hidden') {
    where.isVisible = false;
  }

  if (fromDate || toDate) {
    where.publishAt = {
      ...(where.publishAt || {}),
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  if (bacSection) {
    where.bacSection = bacSection;
  }

  return where;
};

const buildOrderBy = (query) => {
  const sortBy = cleanString(query.sortBy);
  const sortDirection = cleanString(query.sortDirection).toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (sortBy === 'publishAt') {
    return [{ publishAt: sortDirection }, { priorityRank: 'desc' }, { updatedAt: 'desc' }];
  }

  if (sortBy === 'priority') {
    return [{ priorityRank: sortDirection }, { publishAt: 'desc' }, { updatedAt: 'desc' }];
  }

  return [{ updatedAt: sortDirection }, { priorityRank: 'desc' }, { publishAt: 'desc' }];
};

const getStudentCommunications = async (req, res) => {
  try {
    const now = new Date();
    const limit = Math.min(
      20,
      Math.max(1, Number.parseInt(String(req.query.limit || '10'), 10) || 10)
    );

    const items = await prisma.communication.findMany({
      where: {
        bacSection: req.user.bacSection,
        status: 'PUBLISHED',
        isVisible: true,
        OR: [{ publishAt: null }, { publishAt: { lte: now } }],
        AND: [{ OR: [{ expireAt: null }, { expireAt: { gt: now } }] }],
      },
      include: ADMIN_INCLUDE,
      orderBy: [{ priorityRank: 'desc' }, { publishAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    res.json({
      items: items.map(serializeCommunication),
      newCount: items.filter((item) => serializeCommunication(item).isNew).length,
    });
  } catch (error) {
    logger.error('Error fetching student communications', error);
    sendError(res, 500, 'Error fetching communications', error);
  }
};

const getAdminCommunications = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.pageSize || '12'), 10) || 12)
    );
    const where = buildAdminWhere(req.query);
    const orderBy = buildOrderBy(req.query);

    const [total, items] = await Promise.all([
      prisma.communication.count({ where }),
      prisma.communication.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      items: items.map(serializeCommunication),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    logger.error('Error fetching admin communications', error);
    sendError(res, 500, 'Error fetching admin communications', error);
  }
};

const getCommunicationById = async (req, res) => {
  try {
    const item = await prisma.communication.findUnique({
      where: { id: req.params.id },
      include: ADMIN_INCLUDE,
    });

    if (!item) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    res.json(serializeCommunication(item));
  } catch (error) {
    logger.error('Error fetching communication', error);
    sendError(res, 500, 'Error fetching communication', error);
  }
};

const createCommunication = async (req, res) => {
  try {
    const payload = buildPayload(req.body, req.user.id);
    if (payload.error) {
      return res.status(400).json({ message: payload.error });
    }

    await validateCommunicationAttachments(payload.attachments);

    const item = await prisma.communication.create({
      data: {
        ...payload.data,
        attachments: payload.attachments.length
          ? {
              create: payload.attachments,
            }
          : undefined,
      },
      include: ADMIN_INCLUDE,
    });

    res.status(201).json({
      message: 'Communication created successfully',
      item: serializeCommunication(item),
    });
  } catch (error) {
    logger.error('Error creating communication', error);
    sendError(res, 500, 'Error creating communication', error);
  }
};

const updateCommunication = async (req, res) => {
  try {
    const existing = await prisma.communication.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    const payload = buildPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ message: payload.error });
    }

    await validateCommunicationAttachments(payload.attachments);

    const item = await prisma.communication.update({
      where: { id: req.params.id },
      data: {
        ...payload.data,
        createdById: undefined,
        attachments: {
          deleteMany: {},
          ...(payload.attachments.length
            ? {
                create: payload.attachments,
              }
            : {}),
        },
      },
      include: ADMIN_INCLUDE,
    });

    res.json({
      message: 'Communication updated successfully',
      item: serializeCommunication(item),
    });
  } catch (error) {
    logger.error('Error updating communication', error);
    sendError(res, 500, 'Error updating communication', error);
  }
};

const deleteCommunication = async (req, res) => {
  try {
    const existing = await prisma.communication.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        attachments: {
          select: { filePath: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    const attachmentKeys = (existing.attachments || [])
      .map((attachment) => attachment.filePath)
      .filter((value) => value && !/^https?:\/\//i.test(String(value)));

    await prisma.$transaction([
      prisma.communicationAttachment.deleteMany({
        where: { communicationId: req.params.id },
      }),
      prisma.communication.delete({
        where: { id: req.params.id },
      }),
    ]);

    await Promise.all(attachmentKeys.map((key) => deleteObject(key)));

    res.json({ message: 'Communication deleted successfully' });
  } catch (error) {
    sendError(res, 500, 'Error deleting communication', error);
  }
};

const duplicateCommunication = async (req, res) => {
  try {
    const existing = await prisma.communication.findUnique({
      where: { id: req.params.id },
      include: ADMIN_INCLUDE,
    });

    if (!existing) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    const item = await prisma.communication.create({
      data: {
        type: existing.type,
        priority: existing.priority,
        priorityRank: existing.priorityRank,
        status: 'DRAFT',
        isVisible: false,
        audience: existing.audience,
        bacSection: existing.bacSection,
        title: `${existing.title} (Copy)`,
        description: existing.description,
        contentHtml: existing.contentHtml,
        externalLink: existing.externalLink,
        meetingLink: existing.meetingLink,
        buttonText: existing.buttonText,
        buttonUrl: existing.buttonUrl,
        publishAt: null,
        expireAt: null,
        createdById: req.user.id,
        attachments: existing.attachments.length
          ? {
              create: existing.attachments.map((attachment) => ({
                kind: attachment.kind,
                label: attachment.label,
                filePath: attachment.filePath,
                url: attachment.url,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
              })),
            }
          : undefined,
      },
      include: ADMIN_INCLUDE,
    });

    res.status(201).json({
      message: 'Communication duplicated successfully',
      item: serializeCommunication(item),
    });
  } catch (error) {
    logger.error('Error duplicating communication', error);
    sendError(res, 500, 'Error duplicating communication', error);
  }
};

const setCommunicationVisibility = async (req, res) => {
  try {
    const item = await prisma.communication.update({
      where: { id: req.params.id },
      data: {
        isVisible: parseBoolean(req.body.isVisible, true),
      },
      include: ADMIN_INCLUDE,
    });

    res.json({
      message: 'Communication visibility updated successfully',
      item: serializeCommunication(item),
    });
  } catch (error) {
    logger.error('Error updating communication visibility', error);
    sendError(res, 500, 'Error updating communication visibility', error);
  }
};

const publishCommunication = async (req, res) => {
  try {
    const item = await prisma.communication.update({
      where: { id: req.params.id },
      data: {
        status: 'PUBLISHED',
        publishAt: new Date(),
      },
      include: ADMIN_INCLUDE,
    });

    res.json({
      message: 'Communication published successfully',
      item: serializeCommunication(item),
    });
  } catch (error) {
    logger.error('Error publishing communication', error);
    sendError(res, 500, 'Error publishing communication', error);
  }
};

const scheduleCommunication = async (req, res) => {
  try {
    const publishAt = parseDate(req.body.publishAt);
    const expireAt = parseDate(req.body.expireAt);

    if (publishAt === undefined || !publishAt) {
      return res.status(400).json({ message: 'A valid publish date is required' });
    }

    if (expireAt === undefined) {
      return res.status(400).json({ message: 'Invalid expiration date (must be a valid date or omitted)' });
    }

    if (expireAt != null && expireAt <= publishAt) {
      return res.status(400).json({ message: 'Expiration date must be after publish date' });
    }

    const item = await prisma.communication.update({
      where: { id: req.params.id },
      data: {
        status: 'PUBLISHED',
        publishAt,
        expireAt,
      },
      include: ADMIN_INCLUDE,
    });

    res.json({
      message: 'Communication scheduled successfully',
      item: serializeCommunication(item),
    });
  } catch (error) {
    logger.error('Error scheduling communication', error);
    sendError(res, 500, 'Error scheduling communication', error);
  }
};

const archiveCommunication = async (req, res) => {
  try {
    const item = await prisma.communication.update({
      where: { id: req.params.id },
      data: {
        status: 'ARCHIVED',
      },
      include: ADMIN_INCLUDE,
    });

    res.json({
      message: 'Communication archived successfully',
      item: serializeCommunication(item),
    });
  } catch (error) {
    logger.error('Error archiving communication', error);
    sendError(res, 500, 'Error archiving communication', error);
  }
};

module.exports = {
  archiveCommunication,
  createCommunication,
  deleteCommunication,
  duplicateCommunication,
  getAdminCommunications,
  getCommunicationById,
  getStudentCommunications,
  publishCommunication,
  scheduleCommunication,
  setCommunicationVisibility,
  updateCommunication,
};
