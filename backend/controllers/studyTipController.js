const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');
const { resolveRequestedBacSection } = require('../utils/bacSection');

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const optionalString = (value) => {
  const normalized = cleanString(value);
  return normalized ? normalized : null;
};
const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

const listPublicTips = async (req, res) => {
  try {
    const stepId = optionalString(req.query.stepId);
    const subjectId = optionalString(req.query.subjectId);
    const bacSection = resolveRequestedBacSection(req.query.bacSection);

    const scopeConditions = [];
    if (stepId) {
      scopeConditions.push({ OR: [{ stepId }, { stepId: null }] });
    }
    if (subjectId) {
      scopeConditions.push({ OR: [{ subjectId }, { subjectId: null }] });
    }
    if (bacSection) {
      scopeConditions.push({ OR: [{ bacSection }, { bacSection: null }] });
    }
    const where = {
      isPublished: true,
      ...(scopeConditions.length > 0 ? { AND: scopeConditions } : {}),
    };

    const tips = await prisma.studyTip.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ tips });
  } catch (error) {
    logger.error('Error listing public study tips', error);
    sendError(res, 500, 'Error fetching study tips', error);
  }
};

const listAllTips = async (req, res) => {
  try {
    const tips = await prisma.studyTip.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ tips });
  } catch (error) {
    logger.error('Error listing all study tips', error);
    sendError(res, 500, 'Error fetching study tips', error);
  }
};

const createTip = async (req, res) => {
  try {
    const content = optionalString(req.body.content);
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    const title = optionalString(req.body.title);
    const stepId = optionalString(req.body.stepId);
    const subjectId = optionalString(req.body.subjectId);
    const courseId = optionalString(req.body.courseId);
    const bacSection = resolveRequestedBacSection(req.body.bacSection);
    const isPublished = parseBoolean(req.body.isPublished, true);
    const order = Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0;

    const tip = await prisma.studyTip.create({
      data: {
        title,
        content,
        stepId,
        subjectId,
        courseId,
        bacSection,
        isPublished,
        order,
        createdById: req.user?.id || null,
      },
    });
    res.status(201).json({ message: 'Study tip created', tip });
  } catch (error) {
    logger.error('Error creating study tip', error);
    sendError(res, 500, 'Error creating study tip', error);
  }
};

const updateTip = async (req, res) => {
  try {
    const existing = await prisma.studyTip.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Study tip not found' });
    }

    const title = req.body.title !== undefined ? optionalString(req.body.title) : existing.title;
    const content = req.body.content !== undefined ? optionalString(req.body.content) : existing.content;
    if (req.body.content !== undefined && !content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    const stepId = req.body.stepId !== undefined ? optionalString(req.body.stepId) : existing.stepId;
    const subjectId = req.body.subjectId !== undefined ? optionalString(req.body.subjectId) : existing.subjectId;
    const courseId = req.body.courseId !== undefined ? optionalString(req.body.courseId) : existing.courseId;
    const bacSection = req.body.bacSection !== undefined
      ? resolveRequestedBacSection(req.body.bacSection)
      : existing.bacSection;
    const isPublished = req.body.isPublished !== undefined
      ? parseBoolean(req.body.isPublished, existing.isPublished)
      : existing.isPublished;
    const order = req.body.order !== undefined
      ? (Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0)
      : existing.order;

    const tip = await prisma.studyTip.update({
      where: { id: req.params.id },
      data: {
        title,
        content,
        stepId,
        subjectId,
        courseId,
        bacSection,
        isPublished,
        order,
      },
    });
    res.json({ message: 'Study tip updated', tip });
  } catch (error) {
    logger.error('Error updating study tip', error);
    sendError(res, 500, 'Error updating study tip', error);
  }
};

const deleteTip = async (req, res) => {
  try {
    const existing = await prisma.studyTip.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Study tip not found' });
    }
    await prisma.studyTip.delete({ where: { id: req.params.id } });
    res.json({ message: 'Study tip deleted' });
  } catch (error) {
    logger.error('Error deleting study tip', error);
    sendError(res, 500, 'Error deleting study tip', error);
  }
};

const setTipPublish = async (req, res) => {
  try {
    const existing = await prisma.studyTip.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Study tip not found' });
    }
    const isPublished = parseBoolean(req.body.isPublished, true);
    const tip = await prisma.studyTip.update({
      where: { id: req.params.id },
      data: { isPublished },
    });
    res.json({ message: `Study tip ${isPublished ? 'published' : 'unpublished'}`, tip });
  } catch (error) {
    logger.error('Error setting study tip publish status', error);
    sendError(res, 500, 'Error updating study tip publish status', error);
  }
};

module.exports = {
  listPublicTips,
  listAllTips,
  createTip,
  updateTip,
  deleteTip,
  setTipPublish,
};
