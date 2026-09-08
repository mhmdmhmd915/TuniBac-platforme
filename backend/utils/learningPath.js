const prisma = require('../lib/prisma');
const { resolveSectionList, isContentVisibleForSections, isSubjectVisibleForSections } = require('./bacSection');

// Loads a teacher's scope: allowed subject ids and bac sections.
const getTeacherScope = async (teacherId) => {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId },
    select: { subjectId: true, bacSection: true },
  });

  return {
    assignments,
    subjectIds: assignments.filter((a) => a.subjectId).map((a) => a.subjectId),
    sections: assignments.filter((a) => a.bacSection).map((a) => a.bacSection),
    hasRestrictions: assignments.length > 0,
  };
};

// A teacher can manage content of a subject if they are restricted and the subject is in scope,
// or they have no subject restriction (subject unrestricted).
const teacherCanManageSubject = (scope, subjectId) => {
  if (!scope.hasRestrictions) {
    return false;
  }

  if (scope.subjectIds.length === 0) {
    return true;
  }

  return scope.subjectIds.includes(subjectId);
};

// A teacher can assign content to a section only if the section is in their assigned scope.
// Returns true if every requested section is within scope; false otherwise.
const teacherCanUseSections = (scope, requestedSections = []) => {
  if (!scope.hasRestrictions) {
    return false;
  }

  const normalized = Array.isArray(requestedSections) ? requestedSections.filter(Boolean) : [];

  // If teacher has no explicit sections assigned, they may not use unrestricted sections unless
  // they have no section restrictions whatsoever (scope.sections.length === 0 + assignments present).
  if (normalized.length === 0) {
    // No sections requested explicitly: resolveContentSections will use the subject's defaults.
    // That is allowed as long as the subject itself is in scope (checked separately via teacherCanManageSubject).
    return true;
  }

  if (scope.sections.length === 0) {
    // No section restrictions on the teacher's scope → allow any sections.
    return true;
  }

  return normalized.every((section) => scope.sections.includes(section));
};

// Asserts teacher role scope is OK for a given subjectId + sections set.
// Returns {ok:true} or {ok:false, status:403, message:'...'}. Used by all content writes.
const assertTeacherScope = async (teacherId, { subjectId, sections }) => {
  const scope = await getTeacherScope(teacherId);
  if (!teacherCanManageSubject(scope, subjectId)) {
    return {
      ok: false,
      status: 403,
      message: 'This subject is outside your assigned teaching scope. Contact an admin for access.',
    };
  }
  if (!teacherCanUseSections(scope, sections)) {
    return {
      ok: false,
      status: 403,
      message: 'One or more sections you selected are outside your assigned teaching scope.',
    };
  }
  return { ok: true, scope };
};

// Resolves the effective section assignments for a new/updated course or exercise:
// explicit sections from the body, else the subject's sections, else the subject's primary section.
const resolveContentSections = async (subjectId, explicitSections = []) => {
  if (Array.isArray(explicitSections) && explicitSections.length > 0) {
    return [...new Set(explicitSections)];
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      bacSection: true,
      subjectSections: { select: { bacSection: true } },
    },
  });

  if (!subject) {
    return [];
  }

  if (subject.subjectSections.length > 0) {
    return [...new Set(subject.subjectSections.map((s) => s.bacSection))];
  }

  return [subject.bacSection];
};

// Builds a nested tree: steps -> subjects -> courses/exercises for the current user.
// Returns only content visible to the user's sections.
const buildLearningPathTree = async (req) => {
  const sections = await resolveSectionList(req);
  const role = req.user?.role || 'GUEST';
  const isAdmin = role === 'ADMIN';
  const isTeacher = role === 'TEACHER';
  const canSeeUnpublished = isAdmin || isTeacher;

  const teacherScope = isTeacher ? await getTeacherScope(req.user.id) : null;

  const steps = await prisma.learningStep.findMany({
    where: canSeeUnpublished ? {} : { isPublished: true },
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
    },
  });

  const stepIds = steps.map((s) => s.id);
  if (stepIds.length === 0) {
    return { steps: [] };
  }

  const subjects = await prisma.subject.findMany({
    where: {
      stepId: { in: stepIds },
      ...(canSeeUnpublished ? {} : { isActive: true }),
      ...(isTeacher && teacherScope && teacherScope.subjectIds.length > 0
        ? { id: { in: teacherScope.subjectIds } }
        : {}),
      ...(canSeeUnpublished
        ? {}
        : {
            OR: sections
              ? [
                  { bacSection: { in: sections } },
                  { subjectSections: { some: { bacSection: { in: sections } } } },
                ]
              : undefined,
          }),
    },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      icon: true,
      order: true,
      isActive: true,
      bacSection: true,
      stepId: true,
      subjectSections: { select: { bacSection: true } },
    },
  });

  // Teacher: drop subjects not matching the section visibility assignment (fallback to all if no scope restrictions)
  const scopedSubjects = isTeacher && sections && sections.length > 0
    ? subjects.filter((s) => isSubjectVisibleForSections({ subject: s, sections }))
    : subjects;

  const subjectIds = scopedSubjects.map((s) => s.id);
  const [courses, exercises] = await Promise.all([
    subjectIds.length > 0
      ? prisma.course.findMany({
          where: { subjectId: { in: subjectIds } },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
            isPublished: true,
            order: true,
            contentUrl: true,
            videoPath: true,
            videoUrl: true,
            contentText: true,
            externalLink: true,
            subjectId: true,
            sectionAssignments: { select: { bacSection: true } },
            subject: {
              select: { bacSection: true, subjectSections: { select: { bacSection: true } } },
            },
          },
        })
      : Promise.resolve([]),
    subjectIds.length > 0
      ? prisma.exercise.findMany({
          where: { subjectId: { in: subjectIds } },
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
            groupTitle: true,
            isPublished: true,
            order: true,
            subjectId: true,
            sectionAssignments: { select: { bacSection: true } },
            subject: {
              select: { bacSection: true, subjectSections: { select: { bacSection: true } } },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  // Progress: completed course/exercise ids for this user.
  let completedCourseIds = new Set();
  let completedExerciseIds = new Set();
  if (req.user && !canSeeUnpublished) {
    const progressRows = await prisma.progressTracking.findMany({
      where: { userId: req.user.id },
      select: { courseId: true, exerciseId: true, completed: true },
    });
    for (const row of progressRows) {
      if (row.completed && row.courseId) completedCourseIds.add(row.courseId);
      if (row.completed && row.exerciseId) completedExerciseIds.add(row.exerciseId);
    }
  }

  const useSections = sections || [];
  const visibleCourses = courses.filter((c) => {
    if (isAdmin) return true;
    const sectionOK = useSections.length === 0
      ? true
      : isContentVisibleForSections({ content: c, sections: useSections });
    if (isTeacher) return sectionOK;
    return c.isPublished && sectionOK;
  });
  const visibleExercises = exercises.filter((e) => {
    if (isAdmin) return true;
    const sectionOK = useSections.length === 0
      ? true
      : isContentVisibleForSections({ content: e, sections: useSections });
    if (isTeacher) return sectionOK;
    return e.isPublished && sectionOK;
  });

  const coursesBySubject = new Map();
  const exercisesBySubject = new Map();
  for (const course of visibleCourses) {
    if (!coursesBySubject.has(course.subjectId)) coursesBySubject.set(course.subjectId, []);
    coursesBySubject.get(course.subjectId).push({
      id: course.id,
      title: course.title,
      description: course.description,
      difficulty: course.difficulty,
      isPublished: course.isPublished,
      order: course.order,
      hasVideo: Boolean(course.videoPath || course.videoUrl),
      hasPdf: Boolean(course.contentUrl),
      hasText: Boolean(course.contentText),
      hasLink: Boolean(course.externalLink),
      completed: completedCourseIds.has(course.id),
    });
  }
  for (const exercise of visibleExercises) {
    if (!exercisesBySubject.has(exercise.subjectId)) exercisesBySubject.set(exercise.subjectId, []);
    exercisesBySubject.get(exercise.subjectId).push({
      id: exercise.id,
      title: exercise.title,
      description: exercise.description,
      difficulty: exercise.difficulty,
      groupTitle: exercise.groupTitle,
      isPublished: exercise.isPublished,
      order: exercise.order,
      completed: completedExerciseIds.has(exercise.id),
    });
  }

  const subjectsByStep = new Map();
  for (const subject of subjects) {
    const courses = coursesBySubject.get(subject.id) || [];
    const exercises = exercisesBySubject.get(subject.id) || [];
    const total = courses.length + exercises.length;
    const done = courses.filter((c) => c.completed).length + exercises.filter((e) => e.completed).length;

    if (!subjectsByStep.has(subject.stepId)) subjectsByStep.set(subject.stepId, []);
    subjectsByStep.get(subject.stepId).push({
      id: subject.id,
      name: subject.name,
      description: subject.description,
      color: subject.color,
      icon: subject.icon,
      order: subject.order,
      isActive: subject.isActive,
      bacSection: subject.bacSection,
      sections: subject.subjectSections.map((s) => s.bacSection),
      courses,
      exercises,
      courseCount: courses.length,
      exerciseCount: exercises.length,
      progress: {
        completed: done,
        total,
        percent: total > 0 ? Math.round((done / total) * 100) : 0,
      },
    });
  }

  const tree = steps
    .map((step) => {
      const stepSubjects = subjectsByStep.get(step.id) || [];
      const total = stepSubjects.reduce((sum, s) => sum + s.progress.total, 0);
      const done = stepSubjects.reduce((sum, s) => sum + s.progress.completed, 0);
      return {
        ...step,
        subjects: stepSubjects,
        subjectCount: stepSubjects.length,
        courseCount: stepSubjects.reduce((sum, s) => sum + s.courseCount, 0),
        exerciseCount: stepSubjects.reduce((sum, s) => sum + s.exerciseCount, 0),
        progress: {
          completed: done,
          total,
          percent: total > 0 ? Math.round((done / total) * 100) : 0,
        },
      };
    })
    .filter((s) => isAdmin || s.subjectCount > 0);

  return { steps: tree };
};

module.exports = {
  getTeacherScope,
  teacherCanManageSubject,
  teacherCanUseSections,
  assertTeacherScope,
  resolveContentSections,
  buildLearningPathTree,
};
