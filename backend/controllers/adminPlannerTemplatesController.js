const prisma = require('../lib/prisma');
const { pickAttachmentFields } = require('../utils/plannerAttachment');
const { VALID_BAC_SECTIONS, normalizeBacSection } = require('../utils/bacSection');
const { sendError } = require('../utils/http');

const normalizeBacSectionsArray = (value) => {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((item) => normalizeBacSection(item))
    .filter((item) => item && VALID_BAC_SECTIONS.has(item));
  return Array.from(new Set(normalized));
};

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveTargetScope = ({ targetAll, targetBacSections }) => {
  const all = Boolean(targetAll);
  const sections = normalizeBacSectionsArray(targetBacSections);
  if (all) {
    return { targetAll: true, targetBacSections: [] };
  }
  return { targetAll: false, targetBacSections: sections };
};

async function listPlannerTemplates(req, res) {
  try {
    const published = typeof req.query.published === 'string' ? req.query.published.trim().toLowerCase() : '';
    const where = {};

    if (published === 'true') {
      where.publishedAt = { not: null };
    }
    if (published === 'false') {
      where.publishedAt = null;
    }

    const items = await prisma.plannerTemplate.findMany({
      where,
      include: { subject: true, createdBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json(items);
  } catch (error) {
    return sendError(res, 500, 'Error fetching planner templates', error);
  }
}

async function publishTemplateToStudents(template) {
  const targetWhere = {
    role: 'STUDENT',
    status: 'APPROVED',
  };

  if (!template.targetAll) {
    targetWhere.bacSection = { in: template.targetBacSections };
  }

  const [targetStudents, existingTasks] = await Promise.all([
    prisma.user.findMany({ where: targetWhere, select: { id: true } }),
    prisma.studentPlannerTask.findMany({
      where: { templateId: template.id },
      select: { userId: true },
    }),
  ]);

  const existingUserIds = new Set(existingTasks.map((task) => task.userId));
  const missingUserIds = targetStudents.map((user) => user.id).filter((id) => !existingUserIds.has(id));

  if (missingUserIds.length === 0) {
    return { createdCount: 0 };
  }

  const base = {
    title: template.title,
    description: template.description,
    dueAt: template.dueAt,
    priority: template.priority,
    subjectId: template.subjectId,
    templateId: template.id,
    isPersonal: false,
    attachmentKind: template.attachmentKind,
    attachmentLabel: template.attachmentLabel,
    attachmentFilePath: template.attachmentFilePath,
    attachmentUrl: template.attachmentUrl,
    attachmentMimeType: template.attachmentMimeType,
    attachmentSizeBytes: template.attachmentSizeBytes,
  };

  await prisma.studentPlannerTask.createMany({
    data: missingUserIds.map((userId) => ({ ...base, userId })),
  });

  return { createdCount: missingUserIds.length };
}

async function createPlannerTemplate(req, res) {
  try {
    const dueAt = toDate(req.body?.dueAt);
    if (!dueAt) {
      return res.status(400).json({ message: 'Invalid due date' });
    }

    const subjectId = String(req.body?.subjectId || '').trim();
    if (!subjectId) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    const title = String(req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const targeting = resolveTargetScope({
      targetAll: req.body?.targetAll,
      targetBacSections: req.body?.targetBacSections,
    });

    if (!targeting.targetAll && targeting.targetBacSections.length === 0) {
      return res.status(400).json({ message: 'Select at least one BAC section or target all students' });
    }

    const created = await prisma.plannerTemplate.create({
      data: {
        title,
        description: req.body?.description ? String(req.body.description) : null,
        dueAt,
        priority: req.body?.priority ? String(req.body.priority) : null,
        subjectId,
        createdById: req.user.id,
        ...pickAttachmentFields(req.body),
        ...targeting,
      },
      include: { subject: true },
    });

    const shouldPublish = Boolean(req.body?.publish);
    if (!shouldPublish) {
      return res.status(201).json(created);
    }

    const publishedAt = created.publishedAt ? created.publishedAt : new Date();
    const updated = await prisma.plannerTemplate.update({
      where: { id: created.id },
      data: { publishedAt },
      include: { subject: true },
    });

    const result = await publishTemplateToStudents(updated);

    return res.status(201).json({ ...updated, publishResult: result });
  } catch (error) {
    return sendError(res, 500, 'Error creating planner template', error);
  }
}

async function updatePlannerTemplate(req, res) {
  try {
    const templateId = String(req.params.id || '').trim();
    if (!templateId) {
      return res.status(400).json({ message: 'Invalid template id' });
    }

    const existing = await prisma.plannerTemplate.findUnique({ where: { id: templateId } });
    if (!existing) {
      return res.status(404).json({ message: 'Planner task not found' });
    }

    const data = {};

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
      data.subjectId = subjectId;
    }

    if (req.body?.dueAt !== undefined) {
      const dueAt = toDate(req.body?.dueAt);
      if (!dueAt) return res.status(400).json({ message: 'Invalid due date' });
      data.dueAt = dueAt;
    }

    if (req.body?.targetAll !== undefined || req.body?.targetBacSections !== undefined) {
      const targeting = resolveTargetScope({
        targetAll: req.body?.targetAll ?? existing.targetAll,
        targetBacSections: req.body?.targetBacSections ?? existing.targetBacSections,
      });
      if (!targeting.targetAll && targeting.targetBacSections.length === 0) {
        return res.status(400).json({ message: 'Select at least one BAC section or target all students' });
      }
      data.targetAll = targeting.targetAll;
      data.targetBacSections = targeting.targetBacSections;
    }

    Object.assign(data, pickAttachmentFields(req.body));

    const updated = await prisma.plannerTemplate.update({
      where: { id: templateId },
      data,
      include: { subject: true },
    });

    const shouldPublish = Boolean(req.body?.publish);
    if (!shouldPublish) {
      return res.json(updated);
    }

    const withPublishedAt = updated.publishedAt
      ? updated
      : await prisma.plannerTemplate.update({
          where: { id: templateId },
          data: { publishedAt: new Date() },
          include: { subject: true },
        });

    const result = await publishTemplateToStudents(withPublishedAt);

    return res.json({ ...withPublishedAt, publishResult: result });
  } catch (error) {
    return sendError(res, 500, 'Error updating planner template', error);
  }
}

async function publishPlannerTemplate(req, res) {
  try {
    const templateId = String(req.params.id || '').trim();
    if (!templateId) {
      return res.status(400).json({ message: 'Invalid template id' });
    }

    const template = await prisma.plannerTemplate.findUnique({
      where: { id: templateId },
      include: { subject: true },
    });

    if (!template) {
      return res.status(404).json({ message: 'Planner task not found' });
    }

    const publishedAt = template.publishedAt ? template.publishedAt : new Date();
    const updated = template.publishedAt
      ? template
      : await prisma.plannerTemplate.update({
          where: { id: templateId },
          data: { publishedAt },
          include: { subject: true },
        });

    const result = await publishTemplateToStudents(updated);
    return res.json({ ...updated, publishResult: result });
  } catch (error) {
    return sendError(res, 500, 'Error publishing planner template', error);
  }
}

async function deletePlannerTemplate(req, res) {
  try {
    const templateId = String(req.params.id || '').trim();
    if (!templateId) {
      return res.status(400).json({ message: 'Invalid template id' });
    }

    const existing = await prisma.plannerTemplate.findUnique({ where: { id: templateId } });
    if (!existing) {
      return res.status(404).json({ message: 'Planner task not found' });
    }

    await prisma.plannerTemplate.delete({ where: { id: templateId } });
    return res.json({ deleted: true });
  } catch (error) {
    return sendError(res, 500, 'Error deleting planner template', error);
  }
}

module.exports = {
  listPlannerTemplates,
  createPlannerTemplate,
  updatePlannerTemplate,
  publishPlannerTemplate,
  deletePlannerTemplate,
};
