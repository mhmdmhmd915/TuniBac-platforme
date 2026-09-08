const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const localEnv = dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const localDbUrl = localEnv.parsed && localEnv.parsed.DATABASE_URL;

if (!localDbUrl) {
  console.log('LOCAL_DB_FAIL no DATABASE_URL in .env.local');
  process.exit(1);
}

const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient({ datasources: { db: { url: localDbUrl } } });

(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    const subjects = await prisma.subject.count();
    const courses = await prisma.course.count();
    const exercises = await prisma.exercise.count();
    console.log(
      `LOCAL_DB_OK users=${users} subjects=${subjects} courses=${courses} exercises=${exercises}`
    );
  } catch (error) {
    console.log('LOCAL_DB_FAIL', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
