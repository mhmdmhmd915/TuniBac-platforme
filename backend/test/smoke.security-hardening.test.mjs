import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../index.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();
const SPOOFED_BUFFER = Buffer.from('This is not a PDF file', 'utf8');

describe('smoke: security hardening', () => {
  let adminToken = null;
  const created = {
    userId: null,
    subjectId: null,
    courseId: null,
    exerciseId: null,
  };

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+21620000000', password: 'admin123' });

    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    if (created.courseId) {
      await request(app)
        .delete(`/api/courses/${created.courseId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (created.exerciseId) {
      await request(app)
        .delete(`/api/exercises/${created.exerciseId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (created.subjectId) {
      await request(app)
        .delete(`/api/admin/subjects/${created.subjectId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (created.userId) {
      await request(app)
        .delete(`/api/admin/users/${created.userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    await prisma.$disconnect();
  });

  it('rejects invalid contact payloads, exposes only public settings, and blocks suspended users from protected content details', async () => {
    const invalidContactRes = await request(app)
      .post('/api/contact')
      .send({ name: '   ', email: 'not-an-email', message: '' });

    expect(invalidContactRes.status).toBe(400);

    await prisma.appSetting.upsert({
      where: { key: 'privateAuditOnlyKey' },
      update: { value: 'secret-value' },
      create: { key: 'privateAuditOnlyKey', value: 'secret-value' },
    });

    const settingsRes = await request(app).get('/api/settings');
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.some((item) => item.key === 'privateAuditOnlyKey')).toBe(false);

    const unique = Date.now();
    const studentPhone = `2${String(unique).slice(-7).padStart(7, '0')}`;
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Security',
        lastName: 'Audit',
        phone: studentPhone,
        password: 'student123',
        bacSection: 'MATHEMATIQUES',
      });

    expect(registerRes.status).toBe(201);
    created.userId = registerRes.body.user.id;

    const approveRes = await request(app)
      .put(`/api/admin/users/${created.userId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);

    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        phone: studentPhone,
        password: 'student123',
      });
    expect(userLoginRes.status).toBe(200);
    const userToken = userLoginRes.body.token;

    const subjectRes = await request(app)
      .post('/api/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Security Subject ${unique}`,
        description: 'Security test subject',
        bacSection: 'MATHEMATIQUES',
      });
    expect(subjectRes.status).toBe(201);
    created.subjectId = subjectRes.body.id;

    const courseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Security Course ${unique}`,
        description: 'Security test course',
        subjectId: created.subjectId,
        difficulty: 'BEGINNER',
      });
    expect(courseRes.status).toBe(201);
    created.courseId = courseRes.body.id;

    const exerciseRes = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Security Exercise ${unique}`,
        description: 'Security test exercise',
        subjectId: created.subjectId,
        difficulty: 'BEGINNER',
      });
    expect(exerciseRes.status).toBe(201);
    created.exerciseId = exerciseRes.body.id;

    const suspendRes = await request(app)
      .put(`/api/admin/users/${created.userId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(suspendRes.status).toBe(200);

    const courseDetailRes = await request(app)
      .get(`/api/courses/${created.courseId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(courseDetailRes.status).toBe(401);
    expect(courseDetailRes.body?.message).toBe('Token has been revoked');

    const exerciseDetailRes = await request(app)
      .get(`/api/exercises/${created.exerciseId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(exerciseDetailRes.status).toBe(401);
    expect(exerciseDetailRes.body?.message).toBe('Token has been revoked');

    await prisma.appSetting.delete({ where: { key: 'privateAuditOnlyKey' } });
  }, 120000);

  it('rejects upload requests with invalid extensions and spoofed file signatures', async () => {
    const invalidExtensionRes = await request(app)
      .post('/api/admin/courses/upload-pdf/presign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        filename: `security-${Date.now()}.exe`,
        contentType: 'application/pdf',
        sizeBytes: SPOOFED_BUFFER.length,
      });

    expect(invalidExtensionRes.status).toBe(400);
    expect(invalidExtensionRes.body?.message).toBe('Invalid file extension');

    const spoofedUploadRes = await request(app)
      .post('/api/admin/courses/upload-pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('pdf', SPOOFED_BUFFER, {
        filename: `security-${Date.now()}.pdf`,
        contentType: 'application/pdf',
      });

    expect(spoofedUploadRes.status).toBe(400);
    expect(spoofedUploadRes.body?.message).toBe(
      'File signature does not match the declared file type'
    );
  });
});
