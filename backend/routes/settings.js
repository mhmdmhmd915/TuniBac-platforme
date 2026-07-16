const express = require('express');
const router = express.Router();
const { ensureDefaultSettings } = require('../controllers/settingsController');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');

const PUBLIC_SETTING_KEYS = [
  'platformName',
  'platformLogo',
  'platformFavicon',
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'supportEmail',
  'supportPhone',
  'maintenanceMode',
  'copyrightText',
  'homepageHeroTitle',
  'homepageHeroText',
  'bacCountdownDate',
  'platformOfferEnabled',
  'platformOfferTitle',
  'platformOfferSubtitle',
  'platformOfferDescription',
  'platformOfferButtonText',
  'platformOfferPrice',
  'platformOfferOldPrice',
  'platformOfferDiscountPercentage',
  'platformOfferPromotionBadge',
  'platformOfferStudentsCount',
  'platformOfferRatingsCount',
  'platformOfferGuaranteeDays',
  'platformOfferBackgroundImage',
  'platformOfferBannerImage',
  'platformOfferLogo',
  'platformOfferVideoUrl',
  'platformOfferFeaturesJson',
  'platformOfferNotesJson',
  'platformOfferCardsJson',
  'platformOfferPromotionsJson',
  'contactPhone',
  'contactEmail',
  'contactAddress',
];

router.get('/', async (req, res) => {
  try {
    await ensureDefaultSettings(null);
    const settings = await prisma.appSetting.findMany({
      select: { key: true, value: true },
      where: { key: { in: PUBLIC_SETTING_KEYS } },
      orderBy: { key: 'asc' },
    });
    res.json(settings);
  } catch (error) {
    return sendError(res, 500, 'Error fetching settings', error);
  }
});

module.exports = router;


