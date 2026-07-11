const { BacSection } = require('../generated/prisma');

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

const resolveSectionScope = (req) => {
  if (req.user?.role === 'ADMIN') {
    return resolveRequestedBacSection(req.query.bacSection) || null;
  }

  if (req.user?.role === 'STUDENT') {
    return req.user.bacSection || DEFAULT_BAC_SECTION;
  }

  return resolveRequestedBacSection(req.query.bacSection) || null;
};

const withSectionFilter = (req, fieldPath = 'bacSection') => {
  const bacSection = resolveSectionScope(req);
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

module.exports = {
  DEFAULT_BAC_SECTION,
  VALID_BAC_SECTIONS,
  normalizeBacSection,
  isValidBacSection,
  resolveRequestedBacSection,
  resolveSectionScope,
  withSectionFilter,
};
