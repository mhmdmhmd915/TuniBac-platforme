const { resolveRequestedBacSection } = require('../utils/bacSection');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');

const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const requestedSection =
      req.user.role === 'ADMIN' ? resolveRequestedBacSection(req.query.bacSection) : null;
    const tasks = await prisma.studyTask.findMany({
      where: {
        userId,
        ...(requestedSection || req.user.role !== 'ADMIN'
          ? {
              subject: {
                bacSection: requestedSection || req.user.bacSection,
              },
            }
          : {}),
      },
      include: { subject: true },
      orderBy: { date: 'asc' },
    });
    res.json(tasks);
  } catch (error) {
    return sendError(res, 500, 'Error fetching tasks', error);
  }
};

const optionalRelationId = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
};

const assertStudyTaskSubject = async (req, subjectId) => {
  if (!subjectId) {
    return null;
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      ...(req.user.role === 'ADMIN'
        ? {}
        : {
            OR: [
              { bacSection: req.user.bacSection },
              { subjectSections: { some: { bacSection: req.user.bacSection } } },
            ],
          }),
    },
    select: { id: true },
  });

  return subject;
};

const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, subjectId, date, startTime, endTime, priority, stepId, courseId, exerciseId } = req.body;
    const subject = await assertStudyTaskSubject(req, subjectId);

    if (!subject) {
      return sendError(res, 400, 'Invalid subject for your Bac Section');
    }

    const task = await prisma.studyTask.create({
      data: {
        title,
        description,
        subjectId,
        stepId: optionalRelationId(stepId),
        courseId: optionalRelationId(courseId),
        exerciseId: optionalRelationId(exerciseId),
        date: new Date(date),
        startTime,
        endTime,
        priority,
        userId,
      },
      include: { subject: true, step: true, course: true, exercise: true },
    });

    res.status(201).json(task);
  } catch (error) {
    return sendError(res, 500, 'Error creating task', error);
  }
};

const updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, subjectId, date, startTime, endTime, priority, completed, stepId, courseId, exerciseId } = req.body;

    const task = await prisma.studyTask.findFirst({
      where: { id, userId },
    });

    if (!task) {
      return sendError(res, 404, 'Task not found');
    }

    if (subjectId !== undefined) {
      const subject = await assertStudyTaskSubject(req, subjectId);
      if (!subject) {
        return sendError(res, 400, 'Invalid subject for your Bac Section');
      }
    }

    const updatedTask = await prisma.studyTask.update({
      where: { id },
      data: {
        title,
        description,
        subjectId,
        stepId: stepId !== undefined ? optionalRelationId(stepId) : undefined,
        courseId: courseId !== undefined ? optionalRelationId(courseId) : undefined,
        exerciseId: exerciseId !== undefined ? optionalRelationId(exerciseId) : undefined,
        date: date ? new Date(date) : undefined,
        startTime,
        endTime,
        priority,
        completed: completed !== undefined ? completed : undefined,
      },
      include: { subject: true, step: true, course: true, exercise: true },
    });

    res.json(updatedTask);
  } catch (error) {
    return sendError(res, 500, 'Error updating task', error);
  }
};

const deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const task = await prisma.studyTask.findFirst({
      where: { id, userId },
    });

    if (!task) {
      return sendError(res, 404, 'Task not found');
    }

    await prisma.studyTask.delete({
      where: { id },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    return sendError(res, 500, 'Error deleting task', error);
  }
};

const toggleComplete = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const task = await prisma.studyTask.findFirst({
      where: { id, userId },
    });

    if (!task) {
      return sendError(res, 404, 'Task not found');
    }

    const updatedTask = await prisma.studyTask.update({
      where: { id },
      data: {
        completed: !task.completed,
      },
      include: { subject: true },
    });

    res.json(updatedTask);
  } catch (error) {
    return sendError(res, 500, 'Error toggling task complete', error);
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleComplete,
};
