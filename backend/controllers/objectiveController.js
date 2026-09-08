const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const optionalString = (value) => {
  const normalized = cleanString(value);
  return normalized ? normalized : null;
};
const normalizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
};
const normalizeProgress = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};
const normalizeStatus = (value) => {
  const valid = new Set(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return valid.has(normalized) ? normalized : null;
};

const listMyObjectives = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const rows = await prisma.learningObjective.findMany({
      where: { userId: req.user.id },
      orderBy: [{ updatedAt: 'desc' }],
    });
    res.json({ items: rows });
  } catch (error) {
    logger.error('Error listing objectives', error);
    sendError(res, 500, 'Error fetching objectives', error);
  }
};

const getObjective = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const objective = await prisma.learningObjective.findUnique({
      where: { id: req.params.id },
    });
    if (!objective) {
      return res.status(404).json({ message: 'Objective not found' });
    }
    if (objective.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ objective });
  } catch (error) {
    logger.error('Error getting objective', error);
    sendError(res, 500, 'Error fetching objective', error);
  }
};

const createObjective = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const title = optionalString(req.body.title);
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    const description = optionalString(req.body.description);
    const stepId = optionalString(req.body.stepId);
    const subjectId = optionalString(req.body.subjectId);
    const courseId = optionalString(req.body.courseId);
    const exerciseId = optionalString(req.body.exerciseId);
    const targetDate = normalizeDate(req.body.targetDate);
    const progress = normalizeProgress(req.body.progress);
    const status = normalizeStatus(req.body.status) || 'NOT_STARTED';
    const completed = req.body.completed === true || status === 'COMPLETED';

    const objective = await prisma.learningObjective.create({
      data: {
        userId: req.user.id,
        title,
        description,
        stepId,
        subjectId,
        courseId,
        exerciseId,
        targetDate,
        progress,
        status,
        completed,
      },
    });
    res.status(201).json({ message: 'Objective created', objective });
  } catch (error) {
    logger.error('Error creating objective', error);
    sendError(res, 500, 'Error creating objective', error);
  }
};

const updateObjective = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const existing = await prisma.learningObjective.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Objective not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const title = optionalString(req.body.title);
    const description = req.body.description !== undefined ? optionalString(req.body.description) : existing.description;
    const stepId = req.body.stepId !== undefined ? optionalString(req.body.stepId) : existing.stepId;
    const subjectId = req.body.subjectId !== undefined ? optionalString(req.body.subjectId) : existing.subjectId;
    const courseId = req.body.courseId !== undefined ? optionalString(req.body.courseId) : existing.courseId;
    const exerciseId = req.body.exerciseId !== undefined ? optionalString(req.body.exerciseId) : existing.exerciseId;
    const targetDate = req.body.targetDate !== undefined ? normalizeDate(req.body.targetDate) : existing.targetDate;
    const progress = req.body.progress !== undefined ? normalizeProgress(req.body.progress) : existing.progress;
    const newStatus = normalizeStatus(req.body.status);
    const status = newStatus || existing.status;
    const completed = req.body.completed !== undefined
      ? req.body.completed === true
      : (status === 'COMPLETED' ? true : existing.completed);

    const objective = await prisma.learningObjective.update({
      where: { id: req.params.id },
      data: {
        ...(title ? { title } : {}),
        description,
        stepId,
        subjectId,
        courseId,
        exerciseId,
        targetDate,
        progress,
        status,
        completed,
      },
    });
    res.json({ message: 'Objective updated', objective });
  } catch (error) {
    logger.error('Error updating objective', error);
    sendError(res, 500, 'Error updating objective', error);
  }
};

const deleteObjective = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const existing = await prisma.learningObjective.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Objective not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await prisma.learningObjective.delete({ where: { id: req.params.id } });
    res.json({ message: 'Objective deleted' });
  } catch (error) {
    logger.error('Error deleting objective', error);
    sendError(res, 500, 'Error deleting objective', error);
  }
};

const markCompleted = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const existing = await prisma.learningObjective.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Objective not found' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const objective = await prisma.learningObjective.update({
      where: { id: req.params.id },
      data: {
        completed: true,
        status: 'COMPLETED',
        progress: 100,
      },
    });
    res.json({ message: 'Objective marked as completed', objective });
  } catch (error) {
    logger.error('Error marking objective completed', error);
    sendError(res, 500, 'Error marking objective completed', error);
  }
};

module.exports = {
  listMyObjectives,
  getObjective,
  createObjective,
  updateObjective,
  deleteObjective,
  markCompleted,
};
