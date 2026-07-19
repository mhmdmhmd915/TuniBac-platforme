import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import request from 'supertest';

import app from '../index.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

const buildLocalPhone = (seed) => `2${String(seed).slice(-7).padStart(7, '0')}`;

describe('smoke: phone auth migration', () => {
  let adminToken = null;
  const createdUserIds = [];

  beforeAll(async () => {
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+21620000000', password: 'admin123' });

    if (adminLoginRes.status !== 200 || !adminLoginRes.body?.token) {
      throw new Error(
        `Admin login failed (status ${adminLoginRes.status}). Run backend seed and ensure JWT_SECRET/DATABASE_URL are set.`
      );
    }

    adminToken = adminLoginRes.body.token;
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await prisma.$transaction([
        prisma.progressTracking.deleteMany({ where: { userId } }),
        prisma.enrollment.deleteMany({ where: { userId } }),
        prisma.studentPlannerTask.deleteMany({ where: { userId } }),
        prisma.studyTask.deleteMany({ where: { userId } }),
        prisma.homeworkSubmission.deleteMany({ where: { userId } }),
        prisma.user.deleteMany({ where: { id: userId } }),
      ]);
    }

    await prisma.$disconnect();
  });

  it('registers with local digits, normalizes to +216, accepts both login formats, and rejects duplicates', async () => {
    const localPhone = buildLocalPhone(Date.now());
    const password = 'student123';

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Phone',
        lastName: 'Student',
        phone: localPhone,
        password,
        bacSection: 'MATHEMATIQUES',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.phone).toBe(`+216${localPhone}`);
    expect(registerRes.body.user.email ?? null).toBeNull();
    createdUserIds.push(registerRes.body.user.id);

    const localLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: localPhone, password });

    expect(localLoginRes.status).toBe(200);
    expect(localLoginRes.body.user.phone).toBe(`+216${localPhone}`);

    const internationalLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: `+216${localPhone}`, password });

    expect(internationalLoginRes.status).toBe(200);
    expect(internationalLoginRes.body.user.phone).toBe(`+216${localPhone}`);

    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Duplicate',
        lastName: 'Student',
        phone: `+216${localPhone}`,
        password,
        bacSection: 'MATHEMATIQUES',
      });

    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.message).toMatch(/phone number/i);
  }, 15000);

  it('rejects invalid Tunisian phone numbers and lets admin add a phone later to a legacy account', async () => {
    const invalidRegisterRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Invalid',
        lastName: 'Phone',
        phone: '12345678',
        password: 'student123',
        bacSection: 'SCIENCES_EXPERIMENTALES',
      });

    expect(invalidRegisterRes.status).toBe(400);
    expect(invalidRegisterRes.body.message).toBe('Invalid Tunisian mobile phone number');

    const legacyPassword = 'legacy123';
    const legacyUser = await prisma.user.create({
      data: {
        email: `legacy-${Date.now()}@example.com`,
        password: await bcrypt.hash(legacyPassword, 12),
        firstName: 'Legacy',
        lastName: 'Student',
        role: 'STUDENT',
        status: 'APPROVED',
        bacSection: 'TECHNIQUE',
        isVerified: true,
        approvalDate: new Date(),
      },
    });
    createdUserIds.push(legacyUser.id);

    const assignedPhone = buildLocalPhone(Date.now() + 123);
    const adminUpdateRes = await request(app)
      .put(`/api/admin/users/${legacyUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: legacyUser.firstName,
        lastName: legacyUser.lastName,
        phone: assignedPhone,
        bacSection: 'TECHNIQUE',
        role: 'STUDENT',
      });

    expect(adminUpdateRes.status).toBe(200);
    expect(adminUpdateRes.body.user.phone).toBe(`+216${assignedPhone}`);

    const legacyLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: assignedPhone, password: legacyPassword });

    expect(legacyLoginRes.status).toBe(200);
    expect(legacyLoginRes.body.user.phone).toBe(`+216${assignedPhone}`);
    expect(legacyLoginRes.body.user.role).toBe('STUDENT');
  }, 10000);
});
