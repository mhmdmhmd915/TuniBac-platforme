const {
  DEFAULT_BAC_SECTION,
  resolveRequestedBacSection,
  subjectVisibilityWhere,
} = require('../utils/bacSection');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');

const normalizeSections = (sections) => {
  if (!Array.isArray(sections)) {
    return null;
  }

  const unique = [
    ...new Set(
      sections
        .map((s) => resolveRequestedBacSection(s))
        .filter(Boolean)
    ),
  ];

  return unique;
};

const getAllSubjects = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const sectionWhere = await subjectVisibilityWhere(req);
    const where = {
      ...sectionWhere,
      ...(activeOnly ? { isActive: true } : {}),
    };
    const subjects = await prisma.subject.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        step: { select: { id: true, title: true, order: true } },
        subjectSections: { select: { bacSection: true } },
        _count: {
          select: {
            courses: true,
            exercises: true,
          },
        },
      },
    });
    res.json(subjects);
  } catch (error) {
    sendError(res, 500, 'Error fetching subjects', error);
  }
};

const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const sectionWhere = await subjectVisibilityWhere(req);
    const subject = await prisma.subject.findFirst({
      where: {
        id,
        ...sectionWhere,
      },
      select: {
        id: true,
        name: true,
        description: true,
        bacSection: true,
        color: true,
        icon: true,
        order: true,
        isActive: true,
        stepId: true,
        step: { select: { id: true, title: true } },
        subjectSections: { select: { bacSection: true } },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            courses: true,
            exercises: true,
            studyTasks: true,
          },
        },
      },
    });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    sendError(res, 500, 'Error fetching subject', error);
  }
};

const createSubject = async (req, res) => {
  try {
    const { name, description, color, icon, order, isActive, stepId } = req.body;
    const bacSection = resolveRequestedBacSection(req.body.bacSection) || DEFAULT_BAC_SECTION;
    const sections = normalizeSections(req.body.sections) || [bacSection];

    const subject = await prisma.subject.create({
      data: {
        name,
        description,
        bacSection,
        stepId: stepId || null,
        color: color || '#3b82f6',
        icon: icon || 'book',
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
        subjectSections: {
          create: sections.map((section) => ({ bacSection: section })),
        },
      },
      include: { subjectSections: { select: { bacSection: true } } },
    });
    res.status(201).json(subject);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Subject name already exists' });
    }
    sendError(res, 500, 'Error creating subject', error);
  }
};

const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, order, isActive, stepId } = req.body;
    const bacSection = resolveRequestedBacSection(req.body.bacSection) || DEFAULT_BAC_SECTION;
    const sections = normalizeSections(req.body.sections);

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name,
        description,
        bacSection,
        stepId: stepId || null,
        color,
        icon,
        order,
        isActive,
        ...(sections
          ? {
              subjectSections: {
                deleteMany: {},
                create: sections.map((section) => ({ bacSection: section })),
              },
            }
          : {}),
      },
      include: { subjectSections: { select: { bacSection: true } } },
    });
    res.json(subject);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Subject name already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Subject not found' });
    }
    sendError(res, 500, 'Error updating subject', error);
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const [relatedCourses, relatedExercises, relatedStudyTasks] = await Promise.all([
      prisma.course.count({ where: { subjectId: id } }),
      prisma.exercise.count({ where: { subjectId: id } }),
      prisma.studyTask.count({ where: { subjectId: id } }),
    ]);

    if (relatedCourses > 0 || relatedExercises > 0 || relatedStudyTasks > 0) {
      return res.status(409).json({
        message: 'Cannot delete subject: it is used by other data',
        usage: {
          courses: relatedCourses,
          exercises: relatedExercises,
          studyTasks: relatedStudyTasks,
        },
      });
    }

    await prisma.subject.delete({ where: { id } });
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Subject not found' });
    }
    sendError(res, 500, 'Error deleting subject', error);
  }
};

const reorderSubjects = async (req, res) => {
  try {
    const orderedItems = Array.isArray(req.body.orderedItems) ? req.body.orderedItems : [];
    if (orderedItems.length === 0) {
      return res.status(400).json({ message: 'orderedItems is required' });
    }

    await prisma.$transaction(
      orderedItems.map((item) =>
        prisma.subject.update({
          where: { id: item.id },
          data: { order: Number(item.order) || 0 },
        })
      )
    );

    res.json({ message: 'Subjects reordered successfully' });
  } catch (error) {
    sendError(res, 500, 'Error reordering subjects', error);
  }
};

const getSubjectUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const [courses, exercises, studyTasks] = await Promise.all([
      prisma.course.count({ where: { subjectId: id } }),
      prisma.exercise.count({ where: { subjectId: id } }),
      prisma.studyTask.count({ where: { subjectId: id } }),
    ]);
    res.json({ courses, exercises, studyTasks });
  } catch (error) {
    sendError(res, 500, 'Error fetching subject usage', error);
  }
};

module.exports = {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  reorderSubjects,
  getSubjectUsage,
};
