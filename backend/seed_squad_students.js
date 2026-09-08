require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
const bcrypt = require('bcrypt');
const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

const STUDENTS = [
  { firstName: 'Squad Test', lastName: 'A', phone: '99111111', bacSection: 'MATHEMATIQUES', role: 'STUDENT', password: 'student123' },
  { firstName: 'Squad Test', lastName: 'B', phone: '99222222', bacSection: 'MATHEMATIQUES', role: 'STUDENT', password: 'student123' },
  { firstName: 'Squad Test', lastName: 'C', phone: '99333333', bacSection: 'MATHEMATIQUES', role: 'STUDENT', password: 'student123' },
  { firstName: 'Squad Test', lastName: 'D', phone: '99444444', bacSection: 'SCIENCES_EXPERIMENTALES', role: 'STUDENT', password: 'student123' },
];

(async () => {
  try {
    const results = [];
    for (const s of STUDENTS) {
      const normPhone = '+216' + s.phone;
      const existing = await prisma.user.findFirst({ where: { phone: normPhone } });
      let user;
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            firstName: s.firstName, lastName: s.lastName,
            bacSection: s.bacSection,
            role: s.role, status: 'APPROVED',
            password: await bcrypt.hash(s.password, 12),
            tokenVersion: { increment: 1 },
          },
          select: { id: true, firstName: true, lastName: true, phone: true, bacSection: true, role: true, status: true },
        });
      } else {
        user = await prisma.user.create({
          data: {
            firstName: s.firstName, lastName: s.lastName,
            phone: normPhone, bacSection: s.bacSection,
            role: s.role, status: 'APPROVED',
            password: await bcrypt.hash(s.password, 12),
          },
          select: { id: true, firstName: true, lastName: true, phone: true, bacSection: true, role: true, status: true },
        });
      }
      results.push({ ...user, passwordRaw: s.password, uiPhone: s.phone });
    }
    console.log(JSON.stringify(results, null, 2));
    console.log('\n=== Created/Updated 3 Squad tests + 1 Security out-squad student ===');
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('SEED ERROR', e);
    try { await prisma.$disconnect(); } catch {}
    process.exit(1);
  }
})();
