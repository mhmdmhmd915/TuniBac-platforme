const { PrismaClient } = require('../generated/prisma');

const globalForPrisma = globalThis;
const isProduction =
  (process.env.NODE_ENV || 'development') === 'production' ||
  String(process.env.RENDER || '').toLowerCase() === 'true';

const prisma =
  globalForPrisma.__academyPrisma ||
  new PrismaClient({
    log: isProduction ? ['error'] : ['warn', 'error'],
  });

if (!isProduction) {
  globalForPrisma.__academyPrisma = prisma;
}

module.exports = prisma;
