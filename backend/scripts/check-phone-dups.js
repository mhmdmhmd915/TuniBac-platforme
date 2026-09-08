const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const localEnv = dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
const localDbUrl = localEnv.parsed && localEnv.parsed.DATABASE_URL;
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient({ datasources: { db: { url: localDbUrl } } });

(async () => {
  try {
    const dups = await prisma.$queryRaw`
      SELECT phone, COUNT(*) AS c FROM "User" WHERE phone IS NOT NULL GROUP BY phone HAVING COUNT(*) > 1
    `;
    const nullPhones = await prisma.user.count({ where: { phone: null } });
    console.log('duplicate_phones=', JSON.stringify(dups));
    console.log('null_phones=', nullPhones);
  } catch (error) {
    console.log('CHECK_FAIL', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
