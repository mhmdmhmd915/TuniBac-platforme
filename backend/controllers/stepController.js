const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');
const { sanitizeUrl } = require('../utils/sanitizeHtml');

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const optionalString = (value) => {
  const normalized = cleanString(value);
  return normalized ? normalized : null;
};
const parseBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};
const parseOrder = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildPayload = (body, existing) => {
  const title = cleanString(body.title);
  if (!title) {
    return { error: 'Title is required' };
  }

  return {
    data: {
      title,
      description: optionalString(body.description),
      icon: optionalString(body.icon) || 'milestone',
      image: optionalString(body.image),
      color: optionalString(body.color) || '#0B5ED7',
      order: existing ? existing.order : parseOrder(body.order, 0),
      isPublished: existing ? existing.isPublished : parseBoolean(body.isPublished, true),
    },
  };
};

const getPublicSteps = async (req, res) => {
  try {
    const steps = await prisma.learningStep.findMany({
      where: { isPublished: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        icon: true,
        image: true,
        color: true,
        order: true,
        isPublished: true,
        _count: {
          select: {
            subjects: { where: { isActive: true } },
          },
        },
      },
    });

    const stepIds = steps.map((s) => s.id);
    const [courseCounts, exerciseCounts] = await Promise.all([
      prisma.course.groupBy({
        by: ['subjectId'],
        where: { subject: { stepId: { in: stepIds } }, isPublished: true },
        _count: { _all: true },
      }),
      prisma.exercise.groupBy({
        by: ['subjectId'],
        where: { subject: { stepId: { in: stepIds } }, isPublished: true },
        _count: { _all: true },
      }),
    ]);
    const courseCountBySubject = new Map(courseCounts.map((r) => [r.subjectId, r._count._all]));
    const exerciseCountBySubject = new Map(exerciseCounts.map((r) => [r.subjectId, r._count._all]));

    const subjects = await prisma.subject.findMany({
      where: { stepId: { in: stepIds }, isActive: true },
      select: { id: true, stepId: true },
    });

    const countsByStep = new Map();
    for (const subject of subjects) {
      const entry = countsByStep.get(subject.stepId) || { courses: 0, exercises: 0 };
      entry.courses += courseCountBySubject.get(subject.id) || 0;
      entry.exercises += exerciseCountBySubject.get(subject.id) || 0;
      countsByStep.set(subject.stepId, entry);
    }

    res.json({
      steps: steps.map((step) => ({
        ...step,
        subjectCount: step._count.subjects,
        courseCount: countsByStep.get(step.id)?.courses || 0,
        exerciseCount: countsByStep.get(step.id)?.exercises || 0,
      })),
    });
  } catch (error) {
    logger.error('Error fetching steps', error);
    sendError(res, 500, 'Error fetching steps', error);
  }
};

const getAllSteps = async (req, res) => {
  try {
    const steps = await prisma.learningStep.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        icon: true,
        image: true,
        color: true,
        order: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { subjects: true } },
      },
    });
    res.json({ steps });
  } catch (error) {
    logger.error('Error fetching admin steps', error);
    sendError(res, 500, 'Error fetching admin steps', error);
  }
};

const createStep = async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ message: payload.error });
    }

    const maxOrder = await prisma.learningStep.aggregate({ _max: { order: true } });
    const step = await prisma.learningStep.create({
      data: { ...payload.data, order: (maxOrder._max.order ?? -1) + 1 },
    });

    res.status(201).json({ message: 'Step created successfully', step });
  } catch (error) {
    logger.error('Error creating step', error);
    sendError(res, 500, 'Error creating step', error);
  }
};

const updateStep = async (req, res) => {
  try {
    const existing = await prisma.learningStep.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Step not found' });
    }

    const payload = buildPayload(req.body, existing);
    if (payload.error) {
      return res.status(400).json({ message: payload.error });
    }

    const step = await prisma.learningStep.update({
      where: { id: req.params.id },
      data: payload.data,
    });

    res.json({ message: 'Step updated successfully', step });
  } catch (error) {
    logger.error('Error updating step', error);
    sendError(res, 500, 'Error updating step', error);
  }
};

const deleteStep = async (req, res) => {
  try {
    const existing = await prisma.learningStep.findUnique({
      where: { id: req.params.id },
      select: { id: true, _count: { select: { subjects: true } } },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Step not found' });
    }

    if (existing._count.subjects > 0) {
      return res.status(409).json({
        message: 'Cannot delete a step that still has subjects. Move or delete its subjects first.',
      });
    }

    await prisma.learningStep.delete({ where: { id: req.params.id } });
    res.json({ message: 'Step deleted successfully' });
  } catch (error) {
    logger.error('Error deleting step', error);
    sendError(res, 500, 'Error deleting step', error);
  }
};

const reorderSteps = async (req, res) => {
  try {
    const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : [];
    if (orderedIds.length === 0) {
      return res.status(400).json({ message: 'orderedIds is required' });
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.learningStep.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    res.json({ message: 'Steps reordered successfully' });
  } catch (error) {
    logger.error('Error reordering steps', error);
    sendError(res, 500, 'Error reordering steps', error);
  }
};

const setStepPublish = async (req, res) => {
  try {
    const step = await prisma.learningStep.update({
      where: { id: req.params.id },
      data: { isPublished: parseBoolean(req.body.isPublished, true) },
    });
    res.json({ message: 'Step visibility updated successfully', step });
  } catch (error) {
    logger.error('Error updating step visibility', error);
    sendError(res, 500, 'Error updating step visibility', error);
  }
};

const getPublicStepById = async (req, res) => {
  try {
    const step = await prisma.learningStep.findUnique({
      where: { id: req.params.id },
      include: {
        subjects: {
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            icon: true,
            order: true,
            bacSection: true,
            subjectSections: { select: { bacSection: true } },
            _count: {
              select: { courses: { where: { isPublished: true } }, exercises: { where: { isPublished: true } } },
            },
          },
        },
      },
    });

    if (!step) {
      return res.status(404).json({ message: 'Step not found' });
    }

    res.json({ step });
  } catch (error) {
    logger.error('Error fetching step', error);
    sendError(res, 500, 'Error fetching step', error);
  }
};

module.exports = {
  createStep,
  deleteStep,
  getAllSteps,
  getPublicStepById,
  getPublicSteps,
  reorderSteps,
  setStepPublish,
  updateStep,
};
