const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const localEnv = dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
const url = localEnv.parsed && localEnv.parsed.DATABASE_URL;
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient({ datasources: { db: { url } } });

(async () => {
  const steps = await prisma.learningStep.findMany({ orderBy: { order: 'asc' }, select: { title: true, order: true, isPublished: true } });
  const subjectSections = await prisma.subjectSection.count();
  const courseSections = await prisma.courseSectionAssignment.count();
  const exerciseSections = await prisma.exerciseSectionAssignment.count();
  const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' }, select: { id: true, firstName: true, lastName: true, teacherProfile: { select: { isPublic: true } } } });
  const shop = await prisma.shopProduct.count();
  const ads = await prisma.teacherAdvertisement.count();
  const unassigned = await prisma.subject.count({ where: { stepId: null } });
  const subjectsOnFirstStep = await prisma.subject.count({ where: { step: { order: 0 } } });
  console.log(JSON.stringify({
    steps,
    subjectSections,
    courseSections,
    exerciseSections,
    shop,
    ads,
    unassigned,
    subjectsOnFirstStep,
    teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : null,
    teacherProfilePublic: teacher?.teacherProfile?.isPublic ?? null,
  }, null, 2));
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
