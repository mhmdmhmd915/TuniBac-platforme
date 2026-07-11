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

const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, subjectId, date, startTime, endTime, priority } = req.body;
    const subjectWhere =
      req.user.role === 'ADMIN'
        ? { id: subjectId }
        : { id: subjectId, bacSection: req.user.bacSection };
    const subject = await prisma.subject.findFirst({
      where: subjectWhere,
      select: { id: true },
    });

    if (!subject) {
      return sendError(res, 400, 'Invalid subject for your Bac Section');
    }

    const task = await prisma.studyTask.create({
      data: {
        title,
        description,
        subjectId,
        date: new Date(date),
        startTime,
        endTime,
        priority,
        userId,
      },
      include: { subject: true },
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
    const { title, description, subjectId, date, startTime, endTime, priority, completed } = req.body;
    const subjectWhere =
      req.user.role === 'ADMIN'
        ? { id: subjectId }
        : { id: subjectId, bacSection: req.user.bacSection };
    const subject = await prisma.subject.findFirst({
      where: subjectWhere,
      select: { id: true },
    });

    if (!subject) {
      return sendError(res, 400, 'Invalid subject for your Bac Section');
    }

    const task = await prisma.studyTask.findFirst({
      where: { id, userId },
    });

    if (!task) {
      return sendError(res, 404, 'Task not found');
    }

    const updatedTask = await prisma.studyTask.update({
      where: { id },
      data: {
        title,
        description,
        subjectId,
        date: date ? new Date(date) : undefined,
        startTime,
        endTime,
        priority,
        completed: completed !== undefined ? completed : undefined,
      },
      include: { subject: true },
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
