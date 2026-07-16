const prisma = require('../lib/prisma');
const { pickAttachmentFields } = require('../utils/plannerAttachment');
const { sendError } = require('../utils/http');
const {
  ensurePublishedTemplatesForStudent,
  migrateLegacyStudyTasks,
} = require('../utils/studentPlannerProvisioning');

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

async function getStudentPlannerTasks(req, res) {
  try {
    const userId = req.user.id;
    await Promise.all([
      migrateLegacyStudyTasks(userId),
      ensurePublishedTemplatesForStudent(userId, req.user.bacSection),
    ]);

    const items = await prisma.studentPlannerTask.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });
    return res.json(items);
  } catch (error) {
    return sendError(res, 500, 'Error fetching student planner tasks', error);
  }
}

async function createStudentPlannerTask(req, res) {
  try {
    const userId = req.user.id;
    const dueAt = toDate(req.body?.dueAt);
    if (!dueAt) {
      return res.status(400).json({ message: 'Invalid due date' });
    }

    const subjectId = String(req.body?.subjectId || '').trim();
    if (!subjectId) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { bacSection: true } });
    if (!subject) {
      return res.status(400).json({ message: 'Subject not found' });
    }

    if (req.user.role !== 'ADMIN' && subject.bacSection !== req.user.bacSection) {
      return res.status(400).json({ message: 'Subject must belong to your BAC section' });
    }

    const title = String(req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const created = await prisma.studentPlannerTask.create({
      data: {
        title,
        description: req.body?.description ? String(req.body.description) : null,
        dueAt,
        priority: req.body?.priority ? String(req.body.priority) : null,
        subjectId,
        userId,
        isPersonal: true,
        templateId: null,
        ...pickAttachmentFields(req.body),
      },
      include: { subject: true },
    });

    return res.status(201).json(created);
  } catch (error) {
    return sendError(res, 500, 'Error creating student planner task', error);
  }
}

async function updateStudentPlannerTask(req, res) {
  try {
    const userId = req.user.id;
    const taskId = String(req.params.id || '').trim();
    if (!taskId) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const existing = await prisma.studentPlannerTask.findFirst({
      where: { id: taskId, userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const data = {};

    if (req.body?.dueAt !== undefined) {
      const dueAt = toDate(req.body?.dueAt);
      if (!dueAt) return res.status(400).json({ message: 'Invalid due date' });
      data.dueAt = dueAt;
    }

    if (req.body?.title !== undefined) {
      const title = String(req.body?.title || '').trim();
      if (!title) return res.status(400).json({ message: 'Title is required' });
      data.title = title;
    }

    if (req.body?.description !== undefined) {
      data.description = req.body?.description ? String(req.body.description) : null;
    }

    if (req.body?.priority !== undefined) {
      data.priority = req.body?.priority ? String(req.body.priority) : null;
    }

    if (req.body?.subjectId !== undefined) {
      const subjectId = String(req.body?.subjectId || '').trim();
      if (!subjectId) return res.status(400).json({ message: 'Subject is required' });

      const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { bacSection: true } });
      if (!subject) return res.status(400).json({ message: 'Subject not found' });

      if (req.user.role !== 'ADMIN' && subject.bacSection !== req.user.bacSection) {
        return res.status(400).json({ message: 'Subject must belong to your BAC section' });
      }

      data.subjectId = subjectId;
    }

    Object.assign(data, pickAttachmentFields(req.body));

    const updated = await prisma.studentPlannerTask.update({
      where: { id: taskId },
      data,
      include: { subject: true },
    });

    return res.json(updated);
  } catch (error) {
    return sendError(res, 500, 'Error updating student planner task', error);
  }
}

async function toggleStudentPlannerTaskComplete(req, res) {
  try {
    const userId = req.user.id;
    const taskId = String(req.params.id || '').trim();
    if (!taskId) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const existing = await prisma.studentPlannerTask.findFirst({
      where: { id: taskId, userId },
      select: { completed: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updated = await prisma.studentPlannerTask.update({
      where: { id: taskId },
      data: { completed: !existing.completed },
      include: { subject: true },
    });

    return res.json(updated);
  } catch (error) {
    return sendError(res, 500, 'Error toggling student planner task', error);
  }
}

async function deleteStudentPlannerTask(req, res) {
  try {
    const userId = req.user.id;
    const taskId = String(req.params.id || '').trim();
    if (!taskId) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const existing = await prisma.studentPlannerTask.findFirst({
      where: { id: taskId, userId },
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        priority: true,
        subjectId: true,
        isPersonal: true,
        templateId: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!existing.isPersonal || existing.templateId) {
      return res.status(403).json({ message: 'Only personal tasks can be deleted' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.studentPlannerTask.delete({ where: { id: taskId } });

      await tx.studyTask.deleteMany({
        where: {
          userId,
          title: existing.title,
          description: existing.description ?? null,
          subjectId: existing.subjectId,
          date: existing.dueAt,
          priority: existing.priority ?? null,
        },
      });
    });

    return res.json({ deleted: true });
  } catch (error) {
    return sendError(res, 500, 'Error deleting student planner task', error);
  }
}

module.exports = {
  getStudentPlannerTasks,
  createStudentPlannerTask,
  updateStudentPlannerTask,
  toggleStudentPlannerTaskComplete,
  deleteStudentPlannerTask,
};
