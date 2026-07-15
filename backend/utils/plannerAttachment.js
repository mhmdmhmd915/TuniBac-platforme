const toOptionalString = (value) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str ? str : null;
};

const toOptionalInt = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
};

const pickAttachmentFields = (body) => {
  return {
    attachmentKind: toOptionalString(body?.attachmentKind),
    attachmentLabel: toOptionalString(body?.attachmentLabel),
    attachmentFilePath: toOptionalString(body?.attachmentFilePath),
    attachmentUrl: toOptionalString(body?.attachmentUrl),
    attachmentMimeType: toOptionalString(body?.attachmentMimeType),
    attachmentSizeBytes: toOptionalInt(body?.attachmentSizeBytes),
  };
};

module.exports = {
  pickAttachmentFields,
};
