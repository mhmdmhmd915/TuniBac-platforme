const { PrismaClient } = require('../generated/prisma');

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__academyPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__academyPrisma = prisma;
}

module.exports = prisma;
