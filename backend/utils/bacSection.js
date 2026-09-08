const { BacSection } = require('../generated/prisma');
const prisma = require('../lib/prisma');

const DEFAULT_BAC_SECTION = 'SCIENCES_EXPERIMENTALES';
const VALID_BAC_SECTIONS = new Set(Object.values(BacSection));

const normalizeBacSection = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
};

const isValidBacSection = (value) => VALID_BAC_SECTIONS.has(value);

const resolveRequestedBacSection = (value) => {
  const normalized = normalizeBacSection(value);
  return isValidBacSection(normalized) ? normalized : null;
};

const getTeacherSectionList = async (teacherId, { fallbackSection = null } = {}) => {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { teacherId },
    select: { bacSection: true, subjectId: true },
  });

  if (assignments.length === 0) {
    return fallbackSection ? [fallbackSection] : [];
  }

  const explicitSections = assignments
    .filter((a) => a.bacSection)
    .map((a) => a.bacSection);

  if (explicitSections.length > 0) {
    return [...new Set(explicitSections)];
  }

  const subjectIds = assignments
    .filter((a) => a.subjectId)
    .map((a) => a.subjectId);

  if (subjectIds.length === 0) {
    return fallbackSection ? [fallbackSection] : [];
  }

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { bacSection: true },
  });

  const subjectSections = subjects.map((s) => s.bacSection).filter(Boolean);
  if (subjectSections.length === 0 && fallbackSection) {
    return [fallbackSection];
  }
  return [...new Set(subjectSections)];
};

const resolveSectionScope = async (req) => {
  if (req.user?.role === 'ADMIN') {
    return resolveRequestedBacSection(req.query.bacSection) || null;
  }

  if (req.user?.role === 'STUDENT') {
    return req.user.bacSection || DEFAULT_BAC_SECTION;
  }

  if (req.user?.role === 'TEACHER') {
    const sections = await getTeacherSectionList(req.user.id, {
      fallbackSection: req.user.bacSection || null,
    });
    if (sections.length > 0) {
      return sections[0];
    }
    return req.user.bacSection || null;
  }

  return resolveRequestedBacSection(req.query.bacSection) || null;
};

const withSectionFilter = async (req, fieldPath = 'bacSection') => {
  const bacSection = await resolveSectionScope(req);
  if (!bacSection) {
    return {};
  }

  if (!fieldPath.includes('.')) {
    return { [fieldPath]: bacSection };
  }

  const [head, ...rest] = fieldPath.split('.');
  return {
    [head]: withNestedSection(rest, bacSection),
  };
};

const withNestedSection = (segments, bacSection) => {
  if (segments.length === 1) {
    return { [segments[0]]: bacSection };
  }

  const [head, ...rest] = segments;
  return { [head]: withNestedSection(rest, bacSection) };
};

// Returns the list of bac sections a request user is allowed to see, or null (all sections).
const resolveSectionList = async (req) => {
  if (req.user?.role === 'ADMIN') {
    const requested = resolveRequestedBacSection(req.query.bacSection);
    return requested ? [requested] : null;
  }

  if (req.user?.role === 'STUDENT') {
    return [req.user.bacSection || DEFAULT_BAC_SECTION];
  }

  if (req.user?.role === 'TEACHER') {
    return getTeacherSectionList(req.user.id, {
      fallbackSection: req.user.bacSection || null,
    });
  }

  const requested = resolveRequestedBacSection(req.query.bacSection);
  return requested ? [requested] : null;
};

// Prisma `where` fragment making a Subject visible: primary section OR any assigned section.
const subjectVisibilityWhere = async (req) => {
  const sections = await resolveSectionList(req);
  if (!sections) {
    return {};
  }

  return {
    OR: [
      { bacSection: { in: sections } },
      { subjectSections: { some: { bacSection: { in: sections } } } },
    ],
  };
};

// Prisma `where` fragment making a Course/Exercise visible:
// published, and either the content is assigned to one of the user sections,
// or (content has no assignments and its subject is visible).
const contentVisibilityWhere = async (req, { includePublished = true } = {}) => {
  const sections = await resolveSectionList(req);
  if (!sections) {
    return {};
  }

  const subjectVisible = {
    OR: [
      { bacSection: { in: sections } },
      { subjectSections: { some: { bacSection: { in: sections } } } },
    ],
  };

  return {
    ...(includePublished ? { isPublished: true } : {}),
    OR: [
      { sectionAssignments: { some: { bacSection: { in: sections } } } },
      {
        sectionAssignments: { none: {} },
        subject: subjectVisible,
      },
    ],
  };
};

// Pure (non-query) visibility check for an already-loaded content object.
const isContentVisibleForSections = ({ content, sections }) => {
  if (!content || !Array.isArray(sections) || sections.length === 0) {
    return false;
  }

  const contentSections = (content.sectionAssignments || []).map((s) => s.bacSection);
  if (contentSections.length > 0) {
    return sections.some((s) => contentSections.includes(s));
  }

  const subjectSections = (content.subject?.subjectSections || []).map((s) => s.bacSection);
  const subjectPrimary = content.subject?.bacSection;
  return sections.some((s) =>
    subjectSections.length > 0 ? subjectSections.includes(s) : subjectPrimary === s
  );
};

const isSubjectVisibleForSections = ({ subject, sections }) => {
  if (!subject || !Array.isArray(sections) || sections.length === 0) {
    return false;
  }

  const subjectSections = (subject.subjectSections || []).map((s) => s.bacSection);
  return sections.some((s) =>
    subjectSections.length > 0 ? subjectSections.includes(s) : subject.bacSection === s
  );
};

module.exports = {
  DEFAULT_BAC_SECTION,
  VALID_BAC_SECTIONS,
  normalizeBacSection,
  isValidBacSection,
  resolveRequestedBacSection,
  getTeacherSectionList,
  resolveSectionScope,
  resolveSectionList,
  subjectVisibilityWhere,
  contentVisibilityWhere,
  isContentVisibleForSections,
  isSubjectVisibleForSections,
  withSectionFilter,
};
