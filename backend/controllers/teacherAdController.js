const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');
const { sanitizeUrl } = require('../utils/sanitizeHtml');
const { resolveRequestedBacSection } = require('../utils/bacSection');
const { normalizeStoredFileValueToKey, toPublicUrlFromStoredValue, deleteObject } = require('../lib/r2');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const { IMAGE_MAX_SIZE_BYTES, IMAGE_MIME_TYPES } = require('../utils/uploadPolicies');

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const optionalString = (value) => {
  const normalized = cleanString(value);
  return normalized ? normalized : null;
};
const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};
const normalizeWhatsapp = (value) => {
  const digits = String(value || '').replace(/\D+/g, '');
  return digits || null;
};

const normalizePublicResources = (resources) => {
  if (!resources) return null;
  if (Array.isArray(resources)) {
    return resources.map((res) => {
      if (res && typeof res === 'object' && typeof res.file === 'string') {
        return { ...res, file: toPublicUrlFromStoredValue(res.file) || res.file };
      }
      if (typeof res === 'string') {
        return toPublicUrlFromStoredValue(res) || res;
      }
      return res;
    });
  }
  return resources;
};

const serializeAd = (ad) => ({
  ...ad,
  image: ad.image ? toPublicUrlFromStoredValue(ad.image) : null,
  videoUrl: ad.videoUrl && ad.videoType !== 'YOUTUBE'
    ? toPublicUrlFromStoredValue(ad.videoUrl) || ad.videoUrl
    : ad.videoUrl,
  resources: normalizePublicResources(ad.resources),
});

const parseResources = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) || (parsed && typeof parsed === 'object')) return parsed;
    } catch (_e) {
      return [value];
    }
  }
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  return null;
};

const buildAdData = async (req) => {
  const image = req.body.image ? normalizeStoredFileValueToKey(req.body.image) : null;
  if (image) {
    await validateStoredUpload({
      storedValue: image,
      allowedMimeTypes: IMAGE_MIME_TYPES,
      maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
    });
  }

  const videoUrlRaw = optionalString(req.body.videoUrl);
  const videoTypeRaw = optionalString(req.body.videoType);
  const videoTypeUser = videoTypeRaw && videoTypeRaw.toUpperCase() !== 'AUTO' ? videoTypeRaw : null;
  const videoType = videoTypeUser ||
    (videoUrlRaw && (videoUrlRaw.includes('youtube.com') || videoUrlRaw.includes('youtu.be'))
      ? 'YOUTUBE'
      : videoUrlRaw
        ? 'R2'
        : null);

  return {
    image,
    teacherName: optionalString(req.body.teacherName),
    subject: optionalString(req.body.subject),
    description: optionalString(req.body.description),
    whatsapp: normalizeWhatsapp(req.body.whatsapp),
    externalLink: sanitizeUrl(optionalString(req.body.externalLink)),
    bacSection: resolveRequestedBacSection(req.body.bacSection) || null,
    subjectId: optionalString(req.body.subjectId),
    isActive: parseBoolean(req.body.isActive, true),
    isApproved: parseBoolean(req.body.isApproved, false),
    order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0,
    teachingMethod: optionalString(req.body.teachingMethod),
    videoUrl: sanitizeUrl(videoUrlRaw) || (videoUrlRaw ? videoUrlRaw : null),
    videoType,
    resources: parseResources(req.body.resources),
    teacherId: optionalString(req.body.teacherId),
  };
};

const getPublicAds = async (req, res) => {
  try {
    const ads = await prisma.teacherAdvertisement.findMany({
      where: { isActive: true, isApproved: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(ads.map(serializeAd));
  } catch (error) {
    logger.error('Error fetching teacher ads', error);
    sendError(res, 500, 'Error fetching teacher ads', error);
  }
};

const getAllAds = async (req, res) => {
  try {
    const ads = await prisma.teacherAdvertisement.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(ads.map(serializeAd));
  } catch (error) {
    logger.error('Error fetching admin teacher ads', error);
    sendError(res, 500, 'Error fetching teacher ads', error);
  }
};

const createAd = async (req, res) => {
  try {
    const data = await buildAdData(req);
    if (!data.teacherName) {
      return res.status(400).json({ message: 'Teacher name is required' });
    }
    const ad = await prisma.teacherAdvertisement.create({ data });
    res.status(201).json({ message: 'Advertisement created', ad: serializeAd(ad) });
  } catch (error) {
    logger.error('Error creating teacher ad', error);
    sendError(res, 500, 'Error creating teacher ad', error);
  }
};

const updateAd = async (req, res) => {
  try {
    const data = await buildAdData(req);
    const existing = await prisma.teacherAdvertisement.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }
    const ad = await prisma.teacherAdvertisement.update({
      where: { id: req.params.id },
      data,
    });
    if (existing.image && data.image !== existing.image) {
      await deleteObject(existing.image).catch(() => {});
    }
    res.json({ message: 'Advertisement updated', ad: serializeAd(ad) });
  } catch (error) {
    logger.error('Error updating teacher ad', error);
    sendError(res, 500, 'Error updating teacher ad', error);
  }
};

const deleteAd = async (req, res) => {
  try {
    const existing = await prisma.teacherAdvertisement.findUnique({
      where: { id: req.params.id },
      select: { id: true, image: true },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }
    await prisma.teacherAdvertisement.delete({ where: { id: req.params.id } });
    if (existing.image) {
      await deleteObject(existing.image).catch(() => {});
    }
    res.json({ message: 'Advertisement deleted' });
  } catch (error) {
    logger.error('Error deleting teacher ad', error);
    sendError(res, 500, 'Error deleting teacher ad', error);
  }
};

const reorderAds = async (req, res) => {
  try {
    const orderedItems = Array.isArray(req.body.orderedItems) ? req.body.orderedItems : [];
    if (orderedItems.length === 0) {
      return res.status(400).json({ message: 'orderedItems is required' });
    }
    await prisma.$transaction(
      orderedItems.map((item) =>
        prisma.teacherAdvertisement.update({
          where: { id: item.id },
          data: { order: Number(item.order) || 0 },
        })
      )
    );
    res.json({ message: 'Ads reordered successfully' });
  } catch (error) {
    logger.error('Error reordering teacher ads', error);
    sendError(res, 500, 'Error reordering teacher ads', error);
  }
};

module.exports = { getPublicAds, getAllAds, createAd, updateAd, deleteAd, reorderAds };
