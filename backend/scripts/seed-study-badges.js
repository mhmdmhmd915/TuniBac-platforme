const path = require('path');
const dotenv = require('dotenv');
const prisma = require('../lib/prisma');
const { logger } = require('../utils/logger');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const badges = [
  {
    slug: 'focus-1-hour',
    title: '1 Hour Focus',
    description: '1 hour active study in a single live session',
    icon: 'target',
    colorHex: '#0B5ED7',
    thresholdUnit: 'SINGLE_SESSION_MINUTES',
    thresholdMinutes: 60,
    order: 1,
  },
  {
    slug: 'focus-2-hours',
    title: 'Deep Focus 2h',
    description: '2 hours in a single live session',
    icon: 'zap',
    colorHex: '#0A235C',
    thresholdUnit: 'SINGLE_SESSION_MINUTES',
    thresholdMinutes: 120,
    order: 2,
  },
  {
    slug: 'weekly-5-hours',
    title: '5 Hours This Week',
    description: '5 hours total tracked in the current week',
    icon: 'calendar-days',
    colorHex: '#D97706',
    thresholdUnit: 'WEEKLY_TOTAL_MINUTES',
    thresholdMinutes: 300,
    order: 3,
  },
  {
    slug: 'weekly-10-hours',
    title: 'Study Warrior',
    description: '10 hours of study time in one week',
    icon: 'swords',
    colorHex: '#DC2626',
    thresholdUnit: 'WEEKLY_TOTAL_MINUTES',
    thresholdMinutes: 600,
    order: 4,
  },
  {
    slug: 'total-20-hours',
    title: 'Diligent Student',
    description: '20 hours of lifetime active study time',
    icon: 'graduation-cap',
    colorHex: '#0F766E',
    thresholdUnit: 'TOTAL_MINUTES',
    thresholdMinutes: 1200,
    order: 5,
  },
  {
    slug: 'total-50-hours',
    title: 'Bac Champion',
    description: '50 hours of lifetime active study time',
    icon: 'trophy',
    colorHex: '#CA8A04',
    thresholdUnit: 'TOTAL_MINUTES',
    thresholdMinutes: 3000,
    order: 6,
  },
];

const run = async () => {
  logger.info('Seeding study badges...');
  let created = 0;
  let updated = 0;

  for (const data of badges) {
    const existing = await prisma.studyBadge.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      await prisma.studyBadge.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          description: data.description,
          icon: data.icon,
          colorHex: data.colorHex,
          thresholdUnit: data.thresholdUnit,
          thresholdMinutes: data.thresholdMinutes,
          order: data.order,
        },
      });
      updated += 1;
      logger.info(`Updated badge: ${data.slug}`);
    } else {
      await prisma.studyBadge.create({ data });
      created += 1;
      logger.info(`Created badge: ${data.slug}`);
    }
  }

  logger.info(`Seed complete. Created: ${created}, Updated: ${updated}`);
  process.exit(0);
};

run().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
