
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { normalizeStoredFileValueToKey, toPublicUrlFromStoredValue } = require('../lib/r2');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const { IMAGE_MAX_SIZE_BYTES, IMAGE_MIME_TYPES, PDF_MAX_SIZE_BYTES, PDF_MIME_TYPES, VIDEO_MAX_SIZE_BYTES, VIDEO_MIME_TYPES } = require('../utils/uploadPolicies');

const ALLOWED_KEYS = new Set([
  'platformName',
  'platformLogo',
  'platformFavicon',
  'primaryColor',
  'secondaryColor',
  'footerText',
  'socialFacebook',
  'socialInstagram',
  'socialYoutube',
  'socialTiktok',
  'contactPhone',
  'contactEmail',
  'contactAddress',
  'copyrightText',
  'homepageHeroTitle',
  'homepageHeroText',
  'bacCountdownDate',
  'maintenanceMode',
  'platformOfferEnabled',
  'platformOfferTitle',
  'platformOfferSubtitle',
  'platformOfferDescription',
  'platformOfferPrice',
  'platformOfferOldPrice',
  'platformOfferDiscountPercentage',
  'platformOfferPromotionBadge',
  'platformOfferButtonText',
  'platformOfferBackgroundImage',
  'platformOfferBannerImage',
  'platformOfferVideoUrl',
  'platformOfferLogo',
  'platformOfferPrimaryColor',
  'platformOfferSecondaryColor',
  'platformOfferAccentColor',
  'platformOfferDisplayOrder',
  'platformOfferFeaturesJson',
  'platformOfferNotesJson',
  'platformOfferCardsJson',
  'platformOfferPromotionsJson',
]);

const DEFAULT_SETTINGS = [
  { key: 'platformName', value: 'TuniBac' },
  { key: 'platformLogo', value: '' },
  { key: 'platformFavicon', value: '' },
  { key: 'primaryColor', value: '#0B5ED7' },
  { key: 'secondaryColor', value: '#E70013' },
  { key: 'footerText', value: '' },
  { key: 'socialFacebook', value: '' },
  { key: 'socialInstagram', value: '' },
  { key: 'socialYoutube', value: '' },
  { key: 'socialTiktok', value: '' },
  { key: 'contactPhone', value: '' },
  { key: 'contactEmail', value: '' },
  { key: 'contactAddress', value: '' },
  { key: 'copyrightText', value: '' },
  { key: 'homepageHeroTitle', value: '' },
  { key: 'homepageHeroText', value: '' },
  { key: 'bacCountdownDate', value: '' },
  { key: 'maintenanceMode', value: 'false' },
  { key: 'platformOfferEnabled', value: 'true' },
  { key: 'platformOfferTitle', value: "Join Tunisia's Best Bac Platform" },
  { key: 'platformOfferSubtitle', value: 'Everything you need to succeed in your Bac.' },
  {
    key: 'platformOfferDescription',
    value: 'Access premium courses, exercises, planner tools, communication updates, and guided study resources in one platform.',
  },
  { key: 'platformOfferPrice', value: '59 DT / Month' },
  { key: 'platformOfferOldPrice', value: '79 DT' },
  { key: 'platformOfferDiscountPercentage', value: '25' },
  { key: 'platformOfferPromotionBadge', value: '25% OFF' },
  { key: 'platformOfferButtonText', value: 'Create My Account' },
  { key: 'platformOfferBackgroundImage', value: '' },
  { key: 'platformOfferBannerImage', value: '' },
  { key: 'platformOfferVideoUrl', value: '' },
  { key: 'platformOfferLogo', value: '' },
  { key: 'platformOfferPrimaryColor', value: '#0B5ED7' },
  { key: 'platformOfferSecondaryColor', value: '#06295B' },
  { key: 'platformOfferAccentColor', value: '#E70013' },
  { key: 'platformOfferDisplayOrder', value: '1' },
  {
    key: 'platformOfferFeaturesJson',
    value: JSON.stringify([
      'Unlimited Courses',
      'Unlimited Exercises',
      'Homework Correction',
      'Study Planner',
      'Pomodoro Timer',
      'Calendar',
      'Progress Tracking',
      'Resources',
      'Videos',
      'Communication Center',
      'Parascolaire',
    ]),
  },
  {
    key: 'platformOfferNotesJson',
    value: JSON.stringify([
      'Account access stays subject to administrator approval.',
      'All content is automatically filtered by the selected Bac Section.',
    ]),
  },
  {
    key: 'platformOfferCardsJson',
    value: JSON.stringify([
      {
        id: 'courses',
        title: 'Premium Courses',
        description: 'Structured lessons and revisions for your Bac Section.',
        icon: 'Books',
        order: 1,
      },
      {
        id: 'exercises',
        title: 'Thousands of Exercises',
        description: 'Practice with guided solutions and section-specific content.',
        icon: 'Exercises',
        order: 2,
      },
      {
        id: 'planner',
        title: 'Smart Planner',
        description: 'Stay consistent with daily planning, progress, and reminders.',
        icon: 'Planner',
        order: 3,
      },
    ]),
  },
  {
    key: 'platformOfferPromotionsJson',
    value: JSON.stringify([
      {
        id: 'bac-2026',
        title: 'Bac 2026 Offer',
        badge: 'Active Offer',
        description: 'Full platform access with premium study tools and guided support.',
        isActive: true,
      },
    ]),
  },
];

const FILE_SETTING_KEYS = new Set([
  'platformLogo',
  'platformFavicon',
  'platformOfferBackgroundImage',
  'platformOfferBannerImage',
  'platformOfferLogo',
  'platformOfferVideoUrl',
]);

const FILE_SETTING_VALIDATION = {
  platformLogo: { allowedMimeTypes: IMAGE_MIME_TYPES, maxSizeBytes: IMAGE_MAX_SIZE_BYTES },
  platformFavicon: { allowedMimeTypes: IMAGE_MIME_TYPES, maxSizeBytes: IMAGE_MAX_SIZE_BYTES },
  platformOfferBackgroundImage: { allowedMimeTypes: IMAGE_MIME_TYPES, maxSizeBytes: IMAGE_MAX_SIZE_BYTES },
  platformOfferBannerImage: { allowedMimeTypes: IMAGE_MIME_TYPES, maxSizeBytes: IMAGE_MAX_SIZE_BYTES },
  platformOfferLogo: { allowedMimeTypes: IMAGE_MIME_TYPES, maxSizeBytes: IMAGE_MAX_SIZE_BYTES },
  platformOfferVideoUrl: { allowedMimeTypes: VIDEO_MIME_TYPES, maxSizeBytes: VIDEO_MAX_SIZE_BYTES },
};

const ensureDefaultSettings = async (actorId) => {
  await prisma.$transaction(
    DEFAULT_SETTINGS.map((item) =>
      prisma.appSetting.upsert({
        where: { key: item.key },
        create: { key: item.key, value: item.value, updatedBy: actorId || null },
        update: {},
      })
    )
  );

  await prisma.appSetting.updateMany({
    where: { key: 'platformName', value: 'Mouhamed Academy' },
    data: { value: 'TuniBac', updatedBy: actorId || null },
  });
};

const getSettings = async (req, res) => {
  try {
    await ensureDefaultSettings(req.user?.id);
    const settings = await prisma.appSetting.findMany({
      orderBy: { key: 'asc' },
    });
    res.json(
      settings.map((setting) => {
        if (FILE_SETTING_KEYS.has(setting.key)) {
          return { ...setting, value: toPublicUrlFromStoredValue(setting.value) };
        }
        return setting;
      })
    );
  } catch (error) {
    sendError(res, 500, 'Error fetching settings', error);
  }
};

const updateSettings = async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Invalid payload: items must be an array' });
    }

    const filtered = items
      .filter((item) => item && typeof item.key === 'string')
      .map((item) => ({ key: item.key.trim(), value: String(item.value ?? '') }))
      .filter((item) => ALLOWED_KEYS.has(item.key));

    if (filtered.length === 0) {
      return res.status(400).json({ message: 'No valid settings provided' });
    }

    await Promise.all(
      filtered.map(async (item) => {
        if (!FILE_SETTING_KEYS.has(item.key) || !item.value.trim()) {
          return;
        }

        const validation = FILE_SETTING_VALIDATION[item.key];
        if (!validation) {
          return;
        }

        await validateStoredUpload({
          storedValue: normalizeStoredFileValueToKey(item.value),
          allowedMimeTypes: validation.allowedMimeTypes,
          maxSizeBytes: validation.maxSizeBytes,
        });
      })
    );

    const actorId = req.user?.id || null;
    await prisma.$transaction(
      filtered.map((item) =>
        prisma.appSetting.upsert({
          where: { key: item.key },
          create: {
            key: item.key,
            value: FILE_SETTING_KEYS.has(item.key) ? normalizeStoredFileValueToKey(item.value) : item.value,
            updatedBy: actorId,
          },
          update: {
            value: FILE_SETTING_KEYS.has(item.key) ? normalizeStoredFileValueToKey(item.value) : item.value,
            updatedBy: actorId,
          },
        })
      )
    );

    const settings = await prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
    res.json(
      settings.map((setting) => {
        if (FILE_SETTING_KEYS.has(setting.key)) {
          return { ...setting, value: toPublicUrlFromStoredValue(setting.value) };
        }
        return setting;
      })
    );
  } catch (error) {
    sendError(res, 500, 'Error updating settings', error);
  }
};

const uploadSettingAsset = async (req, res) => {
  try {
    const { asset } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const keyMap = {
      logo: 'platformLogo',
      favicon: 'platformFavicon',
      'offer-background': 'platformOfferBackgroundImage',
      'offer-banner': 'platformOfferBannerImage',
      'offer-logo': 'platformOfferLogo',
      'offer-video': 'platformOfferVideoUrl',
    };
    const key = keyMap[asset] || null;
    if (!key) {
      return res.status(400).json({ message: 'Unknown asset type' });
    }

    const actorId = req.user?.id || null;
    const storageKey = String(req.file.storageKey || '');

    const setting = await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: storageKey, updatedBy: actorId },
      update: { value: storageKey, updatedBy: actorId },
    });

    res.json({ fileUrl: toPublicUrlFromStoredValue(setting.value), setting: { ...setting, value: toPublicUrlFromStoredValue(setting.value) } });
  } catch (error) {
    sendError(res, 500, 'Error uploading setting asset', error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  uploadSettingAsset,
  ensureDefaultSettings,
};


