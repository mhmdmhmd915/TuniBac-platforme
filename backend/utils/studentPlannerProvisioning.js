const prisma = require('../lib/prisma');

const buildLegacyKey = (task) =>
  [
    String(task.title || '').trim(),
    String(task.description || '').trim(),
    String(task.subjectId || '').trim(),
    task.priority ? String(task.priority).trim() : '',
    Boolean(task.completed) ? '1' : '0',
    new Date(task.dueAt || task.date).toISOString(),
  ].join('::');

async function ensurePublishedTemplatesForStudent(userId, bacSection) {
  if (!userId || !bacSection) {
    return { createdCount: 0 };
  }

  const [templates, existingTasks] = await Promise.all([
    prisma.plannerTemplate.findMany({
      where: {
        publishedAt: { not: null },
        OR: [{ targetAll: true }, { targetBacSections: { has: bacSection } }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        priority: true,
        subjectId: true,
        attachmentKind: true,
        attachmentLabel: true,
        attachmentFilePath: true,
        attachmentUrl: true,
        attachmentMimeType: true,
        attachmentSizeBytes: true,
      },
    }),
    prisma.studentPlannerTask.findMany({
      where: { userId, templateId: { not: null } },
      select: { templateId: true },
    }),
  ]);

  const existingTemplateIds = new Set(
    existingTasks.map((task) => task.templateId).filter(Boolean)
  );

  const missingTemplates = templates.filter((template) => !existingTemplateIds.has(template.id));
  if (missingTemplates.length === 0) {
    return { createdCount: 0 };
  }

  await prisma.studentPlannerTask.createMany({
    data: missingTemplates.map((template) => ({
      title: template.title,
      description: template.description,
      dueAt: template.dueAt,
      priority: template.priority,
      subjectId: template.subjectId,
      userId,
      templateId: template.id,
      isPersonal: false,
      attachmentKind: template.attachmentKind,
      attachmentLabel: template.attachmentLabel,
      attachmentFilePath: template.attachmentFilePath,
      attachmentUrl: template.attachmentUrl,
      attachmentMimeType: template.attachmentMimeType,
      attachmentSizeBytes: template.attachmentSizeBytes,
    })),
  });

  return { createdCount: missingTemplates.length };
}

async function migrateLegacyStudyTasks(userId) {
  if (!userId) {
    return { migratedCount: 0 };
  }

  const [legacyTasks, existingTasks] = await Promise.all([
    prisma.studyTask.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        priority: true,
        completed: true,
        subjectId: true,
        startTime: true,
        endTime: true,
      },
      orderBy: [{ date: 'asc' }],
    }),
    prisma.studentPlannerTask.findMany({
      where: { userId, isPersonal: true, templateId: null },
      select: {
        title: true,
        description: true,
        dueAt: true,
        priority: true,
        completed: true,
        subjectId: true,
      },
    }),
  ]);

  if (legacyTasks.length === 0) {
    return { migratedCount: 0 };
  }

  const existingCounts = new Map();
  for (const task of existingTasks) {
    const key = buildLegacyKey(task);
    existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
  }

  const missingTasks = [];
  for (const task of legacyTasks) {
    const key = buildLegacyKey(task);
    const remaining = existingCounts.get(key) || 0;
    if (remaining > 0) {
      existingCounts.set(key, remaining - 1);
      continue;
    }

    missingTasks.push({
      title: task.title,
      description: task.description,
      dueAt: task.date,
      priority: task.priority,
      completed: task.completed,
      subjectId: task.subjectId,
      userId,
      isPersonal: true,
      templateId: null,
    });
  }

  await prisma.$transaction(async (tx) => {
    if (missingTasks.length > 0) {
      await tx.studentPlannerTask.createMany({ data: missingTasks });
    }

    await tx.studyTask.deleteMany({ where: { userId } });
  });

  return { migratedCount: missingTasks.length };
}

module.exports = {
  ensurePublishedTemplatesForStudent,
  migrateLegacyStudyTasks,
};
