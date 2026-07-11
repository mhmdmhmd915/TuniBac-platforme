import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import request from 'supertest';

import app from '../index.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

const SECTIONS = [
  'MATHEMATIQUES',
  'SCIENCES_EXPERIMENTALES',
  'TECHNIQUE',
  'LETTRES',
  'ECONOMIE_GESTION',
  'INFORMATIQUE',
  'SPORT',
];

const SAMPLE_PDF_BUFFER = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
    'endobj',
    '4 0 obj',
    '<< /Length 38 >>',
    'stream',
    'BT /F1 18 Tf 40 120 Td (Homework PDF) Tj ET',
    'endstream',
    'endobj',
    'trailer',
    '<< /Root 1 0 R >>',
    '%%EOF',
  ].join('\n'),
  'utf8'
);

const keyFromPublicUrl = (url) => new URL(String(url)).pathname.replace(/^\/+/, '');

describe('smoke: homework uploads and corrections by bac section', () => {
  let adminToken = null;
  const created = {
    userIds: [],
    submissionIds: [],
    uploadKeys: [],
  };

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gmail.com', password: 'admin123' });

    if (adminRes.status !== 200 || !adminRes.body?.token) {
      throw new Error(
        `Admin login failed (status ${adminRes.status}). Run backend seed and ensure env is configured.`
      );
    }

    adminToken = adminRes.body.token;
  });

  afterAll(async () => {
    if (created.submissionIds.length > 0) {
      await prisma.homeworkSubmission.deleteMany({
        where: { id: { in: created.submissionIds } },
      });
    }

    if (created.userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: created.userIds } },
      });
    }

    if (created.uploadKeys.length > 0) {
      for (const path of created.uploadKeys) {
        await request(app)
          .delete('/api/admin/uploads')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ path, force: true });
      }
    }

    await prisma.$disconnect();
  }, 120000);

  it('supports homework upload and admin correction for every bac section', async () => {
    const unique = Date.now();
    const password = 'student123';
    const passwordHash = await bcrypt.hash(password, 10);
    const perSection = new Map();

    for (const section of SECTIONS) {
      const email = `smoke-homework-${section.toLowerCase()}-${unique}@example.com`;
      const user = await prisma.user.create({
        data: {
          email,
          password: passwordHash,
          firstName: 'Smoke',
          lastName: section,
          role: 'STUDENT',
          status: 'APPROVED',
          isVerified: true,
          approvalDate: new Date(),
          bacSection: section,
        },
      });
      created.userIds.push(user.id);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

      expect(loginRes.status).toBe(200);
      expect(typeof loginRes.body.token).toBe('string');
      const studentToken = loginRes.body.token;

      const uploadRes = await request(app)
        .post('/api/homework/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('homework', SAMPLE_PDF_BUFFER, {
          filename: `homework-${section}-${unique}.pdf`,
          contentType: 'application/pdf',
        });

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.bacSection).toBe(section);
      expect(uploadRes.body.fileType).toBe('application/pdf');
      expect(typeof uploadRes.body.fileUrl).toBe('string');
      expect(uploadRes.body.correctionUrl).toBeNull();
      created.submissionIds.push(uploadRes.body.id);
      created.uploadKeys.push(keyFromPublicUrl(uploadRes.body.fileUrl));

      const fileHeadRes = await fetch(uploadRes.body.fileUrl, { method: 'HEAD' });
      expect(fileHeadRes.status).toBe(200);
      expect(fileHeadRes.headers.get('content-type')).toContain('application/pdf');

      const adminListRes = await request(app)
        .get('/api/admin/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ bacSection: section, pageSize: 100 });

      expect(adminListRes.status).toBe(200);
      const listedSubmission = adminListRes.body.items.find((item) => item.id === uploadRes.body.id);
      expect(listedSubmission).toBeTruthy();
      expect(listedSubmission.bacSection).toBe(section);

      const correctionRes = await request(app)
        .put(`/api/admin/submissions/${uploadRes.body.id}/correction`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('correction', SAMPLE_PDF_BUFFER, {
          filename: `correction-${section}-${unique}.pdf`,
          contentType: 'application/pdf',
        });

      expect(correctionRes.status).toBe(200);
      expect(correctionRes.body.status).toBe('REVIEWED');
      expect(typeof correctionRes.body.correctionUrl).toBe('string');
      created.uploadKeys.push(keyFromPublicUrl(correctionRes.body.correctionUrl));

      const correctionHeadRes = await fetch(correctionRes.body.correctionUrl, { method: 'HEAD' });
      expect(correctionHeadRes.status).toBe(200);
      expect(correctionHeadRes.headers.get('content-type')).toContain('application/pdf');

      const studentSubmissionsRes = await request(app)
        .get('/api/homework/my-submissions')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(studentSubmissionsRes.status).toBe(200);
      const studentSubmission = studentSubmissionsRes.body.find((item) => item.id === uploadRes.body.id);
      expect(studentSubmission).toBeTruthy();
      expect(studentSubmission.bacSection).toBe(section);
      expect(studentSubmission.status).toBe('REVIEWED');
      expect(studentSubmission.correctionUrl).toBe(correctionRes.body.correctionUrl);

      perSection.set(section, uploadRes.body.id);
    }

    for (const section of SECTIONS) {
      const adminListRes = await request(app)
        .get('/api/admin/submissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ bacSection: section, pageSize: 100 });

      expect(adminListRes.status).toBe(200);
      expect(adminListRes.body.items.some((item) => item.id === perSection.get(section))).toBe(true);

      for (const [otherSection, otherId] of perSection.entries()) {
        if (otherSection === section) continue;
        expect(adminListRes.body.items.some((item) => item.id === otherId)).toBe(false);
      }
    }
  }, 120000);
});
