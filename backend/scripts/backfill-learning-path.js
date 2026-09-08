// Idempotent backfill for the new TuniBac Learning Path architecture.
// Safe / local-only: only inserts missing rows and sets safe defaults. Never deletes data.
// Run with the local DATABASE_URL, e.g. node scripts/with-local-db.js node scripts/backfill-learning-path.js
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const localEnv = dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
const localDbUrl = localEnv.parsed && localEnv.parsed.DATABASE_URL;

if (!localDbUrl) {
  console.error('backfill: no DATABASE_URL in .env.local — refusing to run against remote.');
  process.exit(1);
}

const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient({ datasources: { db: { url: localDbUrl } } });

const DEFAULT_STEPS = [
  { title: 'Trimestre 1', description: 'Premier trimestre de l’année scolaire', icon: 'milestone', color: '#0B5ED7', order: 0 },
  { title: 'Trimestre 2', description: 'Deuxième trimestre de l’année scolaire', icon: 'milestone', color: '#0B5ED7', order: 1 },
  { title: 'Trimestre 3', description: 'Troisième trimestre de l’année scolaire', icon: 'milestone', color: '#0B5ED7', order: 2 },
  { title: 'Bac Sport', description: 'Épreuve de sport', icon: 'trophy', color: '#0B5ED7', order: 3 },
  { title: 'Bac Blanc', description: 'Examen blanc avant le bac', icon: 'file-text', color: '#0B5ED7', order: 4 },
  { title: 'Bac Principale', description: 'L’examen du bac', icon: 'graduation-cap', color: '#0B5ED7', order: 5 },
];

async function ensureDefaultSteps() {
  let created = 0;
  let firstStepId = null;
  for (const step of DEFAULT_STEPS) {
    const existing = await prisma.learningStep.findFirst({
      where: { title: step.title },
      select: { id: true },
    });
    if (existing) {
      if (!firstStepId) firstStepId = existing.id;
      continue;
    }
    const createdStep = await prisma.learningStep.create({ data: { ...step, isPublished: true } });
    created += 1;
    if (!firstStepId) firstStepId = createdStep.id;
  }
  return { created, firstStepId };
}

async function assignUnassignedSubjects(firstStepId) {
  const res = await prisma.subject.updateMany({
    where: { stepId: null },
    data: { stepId: firstStepId },
  });
  return res.count;
}

async function backfillSubjectSections() {
  const subjects = await prisma.subject.findMany({
    select: { id: true, bacSection: true, subjectSections: { select: { id: true } } },
  });
  let created = 0;
  for (const subject of subjects) {
    if (subject.subjectSections.length > 0) continue;
    await prisma.subjectSection.upsert({
      where: { subjectId_bacSection: { subjectId: subject.id, bacSection: subject.bacSection } },
      create: { subjectId: subject.id, bacSection: subject.bacSection },
      update: {},
    });
    created += 1;
  }
  return created;
}

async function resolveContentSections(subjectId) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { bacSection: true, subjectSections: { select: { bacSection: true } } },
  });
  if (!subject) return [];
  if (subject.subjectSections.length > 0) {
    return subject.subjectSections.map((s) => s.bacSection);
  }
  return [subject.bacSection];
}

async function backfillCourseSections() {
  const courses = await prisma.course.findMany({
    select: { id: true, subjectId: true, sectionAssignments: { select: { id: true } } },
  });
  let created = 0;
  for (const course of courses) {
    if (course.sectionAssignments.length > 0) continue;
    const sections = await resolveContentSections(course.subjectId);
    for (const bacSection of sections) {
      await prisma.courseSectionAssignment.upsert({
        where: { courseId_bacSection: { courseId: course.id, bacSection } },
        create: { courseId: course.id, bacSection },
        update: {},
      });
      created += 1;
    }
  }
  return created;
}

async function backfillExerciseSections() {
  const exercises = await prisma.exercise.findMany({
    select: { id: true, subjectId: true, sectionAssignments: { select: { id: true } } },
  });
  let created = 0;
  for (const exercise of exercises) {
    if (exercise.sectionAssignments.length > 0) continue;
    const sections = await resolveContentSections(exercise.subjectId);
    for (const bacSection of sections) {
      await prisma.exerciseSectionAssignment.upsert({
        where: { exerciseId_bacSection: { exerciseId: exercise.id, bacSection } },
        create: { exerciseId: exercise.id, bacSection },
        update: {},
      });
      created += 1;
    }
  }
  return created;
}

async function publishExistingContent() {
  const courses = await prisma.course.updateMany({ where: {}, data: { isPublished: true } });
  const exercises = await prisma.exercise.updateMany({ where: {}, data: { isPublished: true } });
  return { courses: courses.count, exercises: exercises.count };
}

async function ensureDemoTeacher() {
  const teacherPhone = process.env.TEACHER_PHONE || '+21622222222';
  const teacherEmail = process.env.TEACHER_EMAIL || 'teacher@tunibac.tn';
  const password = process.env.TEACHER_PASSWORD || 'teacher123';
  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone: teacherPhone }, { email: teacherEmail }] },
    include: { teacherProfile: true },
  });

  if (existing) {
    if (existing.role !== 'TEACHER') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'TEACHER' } });
    }
    return { created: false, id: existing.id };
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: teacherEmail,
      phone: teacherPhone,
      password: hashed,
      firstName: 'Ahmed',
      lastName: 'Ben Salem',
      bacSection: 'SCIENCES_EXPERIMENTALES',
      role: 'TEACHER',
      status: 'APPROVED',
      isVerified: true,
      approvalDate: new Date(),
    },
  });

  await prisma.teacherProfile.create({
    data: {
      teacherId: user.id,
      bio: 'Professeur de Mathématiques. Révise avec moi pour le bac !',
      whatsapp: '22222222',
      isPublic: true,
    },
  });

  const mathsSubjects = await prisma.subject.findMany({
    where: { name: { in: ['Mathematics', 'Mathématiques', 'Maths'] } },
    select: { id: true },
    take: 2,
  });

  for (const subject of mathsSubjects) {
    await prisma.teacherAssignment.create({
      data: { teacherId: user.id, subjectId: subject.id },
    });
  }

  return { created: true, id: user.id };
}

async function ensureSampleShop() {
  const count = await prisma.shopProduct.count();
  if (count > 0) return { created: 0 };
  const products = [
    { name: 'Calculatrice scientifique', description: 'Casio fx-991, parfaite pour les épreuves du bac.', price: 89, whatsapp: '22222222', isActive: false, order: 0 },
    { name: 'Pack fiches de révision Maths', description: 'Fiches synthétiques pour réviser efficacement.', price: 25, whatsapp: '22222222', isActive: false, order: 1 },
  ];
  let created = 0;
  for (const product of products) {
    await prisma.shopProduct.create({ data: product });
    created += 1;
  }
  return created;
}

async function ensureSampleTeacherAd() {
  const count = await prisma.teacherAdvertisement.count();
  if (count > 0) return { created: 0 };
  const ad = await prisma.teacherAdvertisement.create({
    data: {
      teacherName: 'Prof. Ahmed Ben Salem',
      subject: 'Mathématiques',
      description: 'Cours particuliers et séries corrigées. Contactez-moi sur WhatsApp !',
      whatsapp: '22222222',
      isActive: false,
      isApproved: false,
      order: 0,
    },
  });
  return { created: 1, id: ad.id };
}

async function main() {
  const steps = await ensureDefaultSteps();
  console.log(`steps: created=${steps.created} firstStepId=${steps.firstStepId || 'N/A'}`);

  const assigned = await assignUnassignedSubjects(steps.firstStepId);
  console.log(`subjects assigned to first step: ${assigned}`);

  const subjectSections = await backfillSubjectSections();
  console.log(`subjectSection rows created: ${subjectSections}`);

  const courseSections = await backfillCourseSections();
  console.log(`courseSectionAssignment rows created: ${courseSections}`);

  const exerciseSections = await backfillExerciseSections();
  console.log(`exerciseSectionAssignment rows created: ${exerciseSections}`);

  const published = await publishExistingContent();
  console.log(`published courses=${published.courses} exercises=${published.exercises}`);

  const teacher = await ensureDemoTeacher();
  console.log(`demo teacher: ${teacher.created ? 'created' : 'already present'} id=${teacher.id}`);

  const shop = await ensureSampleShop();
  console.log(`shop products created (disabled): ${shop.created}`);

  const ad = await ensureSampleTeacherAd();
  console.log(`teacher ads created (disabled): ${ad.created}`);

  console.log('backfill completed');
}

main()
  .catch((err) => {
    console.error('backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
