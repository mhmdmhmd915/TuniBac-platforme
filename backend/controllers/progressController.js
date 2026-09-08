const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { contentVisibilityWhere } = require('../utils/bacSection');

const getMyProgress = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const rows = await prisma.progressTracking.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        courseId: true,
        exerciseId: true,
        completed: true,
        lastReadPos: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ items: rows });
  } catch (error) {
    sendError(res, 500, 'Error fetching progress', error);
  }
};

const resolveSubjectStepForCourseOrExercise = async (target) => {
  if (!target) return { subjectId: null, stepId: null };
  if (target.subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: target.subjectId },
      select: { stepId: true },
    });
    return { subjectId: target.subjectId, stepId: subject?.stepId || null };
  }
  if (target.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: target.courseId },
      select: { subject: { select: { id: true, stepId: true } } },
    });
    return {
      subjectId: course?.subject?.id || null,
      stepId: course?.subject?.stepId || null,
    };
  }
  return { subjectId: null, stepId: null };
};

// UPSERT progress entry for a specific (user, course, exercise).
// Exactly one of courseId or exerciseId should be passed.
const upsertProgress = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { courseId, exerciseId, completed, lastReadPos } = req.body || {};
    const normalCourseId = courseId || null;
    const normalExerciseId = exerciseId || null;

    if (!normalCourseId && !normalExerciseId) {
      return res.status(400).json({ message: 'courseId or exerciseId is required' });
    }

    // Verify student can actually see this target (section isolation).
    const visibilityWhere = await contentVisibilityWhere(req);
    if (normalCourseId) {
      const visible = await prisma.course.findFirst({
        where: { id: normalCourseId, ...visibilityWhere },
        select: { id: true, subjectId: true },
      });
      if (!visible) {
        return res.status(404).json({ message: 'Course not found or outside your section' });
      }
    }
    if (normalExerciseId) {
      const visible = await prisma.exercise.findFirst({
        where: { id: normalExerciseId, ...visibilityWhere },
        select: { id: true, subjectId: true, courseId: true },
      });
      if (!visible) {
        return res.status(404).json({ message: 'Exercise not found or outside your section' });
      }
    }

    const target = normalCourseId
      ? await prisma.course.findUnique({ where: { id: normalCourseId }, select: { subjectId: true } })
      : await prisma.exercise.findUnique({ where: { id: normalExerciseId }, select: { subjectId: true, courseId: true } });

    const upserted = await prisma.progressTracking.upsert({
      where: {
        userId_courseId_exerciseId: {
          userId: req.user.id,
          courseId: normalCourseId,
          exerciseId: normalExerciseId,
        },
      },
      create: {
        userId: req.user.id,
        courseId: normalCourseId,
        exerciseId: normalExerciseId,
        completed: completed === true,
        lastReadPos: Number.isFinite(Number(lastReadPos)) ? Number(lastReadPos) : 0,
      },
      update: {
        ...(completed !== undefined ? { completed: Boolean(completed) } : {}),
        ...(lastReadPos !== undefined && Number.isFinite(Number(lastReadPos))
          ? { lastReadPos: Number(lastReadPos) }
          : {}),
      },
      select: {
        id: true,
        courseId: true,
        exerciseId: true,
        completed: true,
        lastReadPos: true,
        updatedAt: true,
      },
    });

    const { subjectId, stepId } = await resolveSubjectStepForCourseOrExercise(target || {});
    res.json({ progress: upserted, subjectId, stepId });
  } catch (error) {
    sendError(res, 500, 'Error saving progress', error);
  }
};

const markCompleted = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { courseId, exerciseId } = req.body || {};
    const normalCourseId = courseId || null;
    const normalExerciseId = exerciseId || null;
    if (!normalCourseId && !normalExerciseId) {
      return res.status(400).json({ message: 'courseId or exerciseId is required' });
    }
    req.body = { courseId: normalCourseId, exerciseId: normalExerciseId, completed: true };
    return upsertProgress(req, res);
  } catch (error) {
    sendError(res, 500, 'Error marking completed', error);
  }
};

const getMyProgressAggregate = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const visibilityWhere = await contentVisibilityWhere(req);

    const [visibleCourses, visibleExercises, itemsRaw] = await Promise.all([
      prisma.course.findMany({
        where: visibilityWhere,
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              stepId: true,
              step: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.exercise.findMany({
        where: visibilityWhere,
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              stepId: true,
              step: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.progressTracking.findMany({
        where: { userId },
        select: {
          id: true,
          courseId: true,
          exerciseId: true,
          completed: true,
          lastReadPos: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const completedCourseIds = new Set(
      itemsRaw
        .filter((p) => p.courseId && (p.completed === true || (p.lastReadPos || 0) > 0))
        .map((p) => p.courseId)
    );
    const completedExerciseIds = new Set(
      itemsRaw
        .filter((p) => p.exerciseId && (p.completed === true || (p.lastReadPos || 0) > 0))
        .map((p) => p.exerciseId)
    );

    const totalCourses = visibleCourses.length;
    const completedCourses = visibleCourses.filter((c) => completedCourseIds.has(c.id)).length;
    const totalExercises = visibleExercises.length;
    const completedExercises = visibleExercises.filter((e) => completedExerciseIds.has(e.id)).length;

    const safeDiv = (a, b) => (b > 0 ? Math.round((a * 100) / b) : 0);

    const coursesPercent = safeDiv(completedCourses, totalCourses);
    const exercisesPercent = safeDiv(completedExercises, totalExercises);
    const totalOverall = totalCourses + totalExercises;
    const completedOverall = completedCourses + completedExercises;
    const globalPercent = safeDiv(completedOverall, totalOverall);

    const overall = {
      totalCourses,
      completedCourses,
      totalExercises,
      completedExercises,
      studyTimeMinutes: 0,
      coursesPercent,
      exercisesPercent,
      globalPercent,
    };

    const byStepMap = new Map();
    const bySubjectMap = new Map();

    const registerStep = (step, contentType, isCompleted) => {
      if (!step) return;
      const entry = byStepMap.get(step.id) || {
        stepId: step.id,
        stepTitle: step.title,
        totalCourses: 0,
        completedCourses: 0,
        totalExercises: 0,
        completedExercises: 0,
      };
      if (contentType === 'course') {
        entry.totalCourses += 1;
        if (isCompleted) entry.completedCourses += 1;
      } else {
        entry.totalExercises += 1;
        if (isCompleted) entry.completedExercises += 1;
      }
      byStepMap.set(step.id, entry);
    };

    const registerSubject = (subject, contentType, isCompleted) => {
      if (!subject) return;
      const entry = bySubjectMap.get(subject.id) || {
        subjectId: subject.id,
        subjectName: subject.name,
        stepId: subject.stepId,
        totalCourses: 0,
        completedCourses: 0,
        totalExercises: 0,
        completedExercises: 0,
      };
      if (contentType === 'course') {
        entry.totalCourses += 1;
        if (isCompleted) entry.completedCourses += 1;
      } else {
        entry.totalExercises += 1;
        if (isCompleted) entry.completedExercises += 1;
      }
      bySubjectMap.set(subject.id, entry);
    };

    visibleCourses.forEach((course) => {
      const isCompleted = completedCourseIds.has(course.id);
      const subject = course.subject;
      if (subject) {
        registerSubject(subject, 'course', isCompleted);
        if (subject.step) {
          registerStep(subject.step, 'course', isCompleted);
        }
      }
    });

    visibleExercises.forEach((exercise) => {
      const isCompleted = completedExerciseIds.has(exercise.id);
      const subject = exercise.subject;
      if (subject) {
        registerSubject(subject, 'exercise', isCompleted);
        if (subject.step) {
          registerStep(subject.step, 'exercise', isCompleted);
        }
      }
    });

    const byStep = Array.from(byStepMap.values()).map((s) => ({
      ...s,
      percent: safeDiv(s.completedCourses + s.completedExercises, s.totalCourses + s.totalExercises),
    }));

    const bySubject = Array.from(bySubjectMap.values()).map((s) => ({
      ...s,
      percent: safeDiv(s.completedCourses + s.completedExercises, s.totalCourses + s.totalExercises),
    }));

    res.json({
      overall,
      byStep,
      bySubject,
      itemsRaw,
    });
  } catch (error) {
    sendError(res, 500, 'Error computing progress aggregate', error);
  }
};

module.exports = {
  getMyProgress,
  upsertProgress,
  markCompleted,
  getMyProgressAggregate,
};
