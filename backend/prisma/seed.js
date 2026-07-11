const { PrismaClient } = require('../generated/prisma');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default subjects...');

  const defaultSubjects = [
    {
      name: 'Mathematics',
      description: 'Algebra, Calculus, Geometry, and more',
      color: '#3B82F6',
      icon: 'calculator',
      order: 0,
    },
    {
      name: 'Physics',
      description: 'Mechanics, Thermodynamics, Electromagnetism',
      color: '#8B5CF6',
      icon: 'atom',
      order: 1,
    },
    {
      name: 'Science',
      description: 'Biology, Chemistry, and general science',
      color: '#22C55E',
      icon: 'flask-conical',
      order: 2,
    },
    {
      name: 'French',
      description: 'Language, Literature, and Grammar',
      color: '#EF4444',
      icon: 'book',
      order: 3,
    },
    {
      name: 'Arabic',
      description: 'Language, Literature, and Grammar',
      color: '#F97316',
      icon: 'book-open',
      order: 4,
    },
    {
      name: 'English',
      description: 'Language, Literature, and Grammar',
      color: '#14B8A6',
      icon: 'globe',
      order: 5,
    },
    {
      name: 'Philosophy',
      description: 'Logic, Ethics, and Critical Thinking',
      color: '#A855F7',
      icon: 'brain',
      order: 6,
    },
  ];

  for (const subject of defaultSubjects) {
    await prisma.subject.upsert({
      where: { name: subject.name },
      update: {},
      create: subject,
    });
  }

  console.log('Seeding default admin...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

  const legacyAdminEmail = 'admin@mouhamed-academy.tn';
  if (adminEmail !== legacyAdminEmail) {
    const legacyAdmin = await prisma.user.findUnique({ where: { email: legacyAdminEmail } });
    const desiredAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (legacyAdmin && !desiredAdmin) {
      await prisma.user.update({
        where: { id: legacyAdmin.id },
        data: { email: adminEmail },
      });
    }
  }

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedAdminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'APPROVED',
      isVerified: true,
      approvalDate: new Date(),
    },
    create: {
      email: adminEmail,
      password: hashedAdminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'APPROVED',
      isVerified: true,
      approvalDate: new Date(),
    },
  });

  await prisma.appSetting.upsert({
    where: { key: 'platformName' },
    update: {
      value: 'TuniBac',
      updatedBy: adminUser.id,
    },
    create: {
      key: 'platformName',
      value: 'TuniBac',
      updatedBy: adminUser.id,
    },
  });

  console.log('Seeding default student...');

  const studentEmail = process.env.STUDENT_EMAIL || 'student@gmail.com';
  const studentPassword = process.env.STUDENT_PASSWORD || 'student123';
  const hashedStudentPassword = await bcrypt.hash(studentPassword, 12);

  await prisma.user.upsert({
    where: { email: studentEmail },
    update: {
      password: hashedStudentPassword,
      firstName: 'Student',
      lastName: 'User',
      role: 'STUDENT',
      status: 'APPROVED',
      isVerified: true,
      approvalDate: new Date(),
    },
    create: {
      email: studentEmail,
      password: hashedStudentPassword,
      firstName: 'Student',
      lastName: 'User',
      role: 'STUDENT',
      status: 'APPROVED',
      isVerified: true,
      approvalDate: new Date(),
    },
  });

  console.log('Seeding completed!');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
