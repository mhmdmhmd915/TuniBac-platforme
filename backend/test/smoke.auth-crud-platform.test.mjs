import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import axios from 'axios';
import request from 'supertest';

import app from '../index.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

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
    '<< /Length 48 >>',
    'stream',
    'BT /F1 18 Tf 40 120 Td (Auth CRUD smoke test) Tj ET',
    'endstream',
    'endobj',
    'trailer',
    '<< /Root 1 0 R >>',
    '%%EOF',
  ].join('\n'),
  'utf8'
);

const SAMPLE_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s6N0k8AAAAASUVORK5CYII=',
  'base64'
);

const keyFromPublicUrl = (url) => new URL(String(url)).pathname.replace(/^\/+/, '');

describe('smoke: auth approval and platform crud', () => {
  let adminToken = null;
  const created = {
    userId: null,
    subjectId: null,
    courseId: null,
    exerciseId: null,
    communicationId: null,
    duplicatedCommunicationId: null,
    parascolaireId: null,
    uploadedKeys: [],
  };

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gmail.com', password: 'admin123' });

    if (loginRes.status !== 200 || !loginRes.body?.token) {
      throw new Error(`Admin login failed with status ${loginRes.status}`);
    }

    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    if (created.duplicatedCommunicationId) {
      await request(app)
        .delete(`/api/admin/communications/${created.duplicatedCommunicationId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (created.communicationId) {
      await request(app)
        .delete(`/api/admin/communications/${created.communicationId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (created.parascolaireId) {
      await request(app)
        .delete(`/api/parascolaires/${created.parascolaireId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

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

    for (const key of created.uploadedKeys) {
      await request(app)
        .delete('/api/admin/uploads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ path: key, force: true });
    }

    await prisma.$disconnect();
  }, 120000);

  it('covers auth approval lifecycle and CRUD for core admin modules', async () => {
    const unique = Date.now();
    const studentEmail = `smoke-auth-${unique}@example.com`;
    const studentPassword = 'student123';

    const uploadViaPresign = async (route, filename, contentType, buffer) => {
      const presignRes = await request(app)
        .post(route)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          filename,
          contentType,
          sizeBytes: buffer.length,
        });

      expect(presignRes.status).toBe(200);

      const uploadTarget =
        presignRes.body.fileUrl ||
        presignRes.body.publicUrl ||
        presignRes.body.attachment?.filePath ||
        null;

      const putRes = await axios.put(presignRes.body.uploadUrl, buffer, {
        headers: { 'Content-Type': contentType },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0,
        validateStatus: () => true,
      });

      expect(putRes.status).toBeGreaterThanOrEqual(200);
      expect(putRes.status).toBeLessThan(300);

      if (uploadTarget) {
        const headRes = await fetch(uploadTarget, { method: 'HEAD' });
        expect(headRes.status).toBe(200);
      }

      return presignRes.body;
    };

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Smoke',
        lastName: 'Student',
        email: studentEmail,
        password: studentPassword,
        bacSection: 'MATHEMATIQUES',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.status).toBe('PENDING');
    created.userId = registerRes.body.user.id;

    const pendingLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: studentEmail, password: studentPassword });

    expect(pendingLoginRes.status).toBe(200);
    expect(pendingLoginRes.body.user.status).toBe('PENDING');

    const pendingMeRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${pendingLoginRes.body.token}`);

    expect(pendingMeRes.status).toBe(200);
    expect(pendingMeRes.body.user.status).toBe('PENDING');

    const adminUsersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: studentEmail, pageSize: 20 });

    expect(adminUsersRes.status).toBe(200);
    expect(adminUsersRes.body.items.some((item) => item.email === studentEmail)).toBe(true);

    const approveRes = await request(app)
      .put(`/api/admin/users/${created.userId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.user.status).toBe('APPROVED');

    const approvedLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: studentEmail, password: studentPassword });

    expect(approvedLoginRes.status).toBe(200);
    expect(approvedLoginRes.body.user.status).toBe('APPROVED');

    const suspendRes = await request(app)
      .put(`/api/admin/users/${created.userId}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.user.status).toBe('SUSPENDED');

    const reactivateRes = await request(app)
      .put(`/api/admin/users/${created.userId}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.user.status).toBe('APPROVED');

    const subjectCreateRes = await request(app)
      .post('/api/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Smoke Subject ${unique}`,
        description: 'Subject created by auth crud smoke test',
        color: '#2563eb',
        icon: 'BookOpen',
        order: 900 + (unique % 100),
        isActive: true,
        bacSection: 'MATHEMATIQUES',
      });

    expect(subjectCreateRes.status).toBe(201);
    created.subjectId = subjectCreateRes.body.id;

    const subjectUpdateRes = await request(app)
      .put(`/api/admin/subjects/${created.subjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Smoke Subject Updated ${unique}`,
        description: 'Updated subject',
        color: '#16a34a',
        icon: 'Calculator',
        order: 901 + (unique % 100),
        isActive: true,
        bacSection: 'MATHEMATIQUES',
      });

    expect(subjectUpdateRes.status).toBe(200);
    expect(subjectUpdateRes.body.name).toContain('Updated');

    const coursePdf = await uploadViaPresign(
      '/api/admin/courses/upload-pdf/presign',
      `auth-crud-course-${unique}.pdf`,
      'application/pdf',
      SAMPLE_PDF_BUFFER
    );
    const courseContentUrl = coursePdf.fileUrl;

    const courseCreateRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Smoke Course ${unique}`,
        description: 'Course created by smoke test',
        contentUrl: courseContentUrl,
        difficulty: 'BEGINNER',
        tags: ['smoke', 'crud'],
        subjectId: created.subjectId,
      });

    expect(courseCreateRes.status).toBe(201);
    created.courseId = courseCreateRes.body.id;

    const courseUpdateRes = await request(app)
      .put(`/api/courses/${created.courseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Smoke Course Updated ${unique}`,
        description: 'Course updated by smoke test',
        contentUrl: courseContentUrl,
        difficulty: 'ADVANCED',
        tags: ['smoke', 'crud', 'updated'],
        subjectId: created.subjectId,
      });

    expect(courseUpdateRes.status).toBe(200);
    expect(courseUpdateRes.body.title).toContain('Updated');

    const courseGetRes = await request(app)
      .get(`/api/courses/${created.courseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(courseGetRes.status).toBe(200);
    expect(courseGetRes.body.id).toBe(created.courseId);

    const courseListRes = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ bacSection: 'MATHEMATIQUES' });

    expect(courseListRes.status).toBe(200);
    expect(courseListRes.body.some((item) => item.id === created.courseId)).toBe(true);

    const exercisePdf = await uploadViaPresign(
      '/api/admin/exercises/upload-pdf/presign',
      `auth-crud-exercise-${unique}.pdf`,
      'application/pdf',
      SAMPLE_PDF_BUFFER
    );
    const exerciseContentUrl = exercisePdf.fileUrl;

    const exerciseCreateRes = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Smoke Exercise ${unique}`,
        description: 'Exercise created by smoke test',
        contentUrl: exerciseContentUrl,
        difficulty: 'BEGINNER',
        subjectId: created.subjectId,
      });

    expect(exerciseCreateRes.status).toBe(201);
    created.exerciseId = exerciseCreateRes.body.id;

    const exerciseUpdateRes = await request(app)
      .put(`/api/exercises/${created.exerciseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Smoke Exercise Updated ${unique}`,
        description: 'Exercise updated by smoke test',
        contentUrl: exerciseContentUrl,
        difficulty: 'INTERMEDIATE',
        subjectId: created.subjectId,
      });

    expect(exerciseUpdateRes.status).toBe(200);
    expect(exerciseUpdateRes.body.title).toContain('Updated');

    const exerciseGetRes = await request(app)
      .get(`/api/exercises/${created.exerciseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(exerciseGetRes.status).toBe(200);
    expect(exerciseGetRes.body.id).toBe(created.exerciseId);

    const exerciseListRes = await request(app)
      .get('/api/exercises')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ bacSection: 'MATHEMATIQUES' });

    expect(exerciseListRes.status).toBe(200);
    expect(exerciseListRes.body.some((item) => item.id === created.exerciseId)).toBe(true);

    const commImage = await uploadViaPresign(
      '/api/admin/communications/uploads/image/presign',
      `auth-crud-comm-${unique}.png`,
      'image/png',
      SAMPLE_PNG_BUFFER
    );
    const commPdf = await uploadViaPresign(
      '/api/admin/communications/uploads/pdf/presign',
      `auth-crud-comm-${unique}.pdf`,
      'application/pdf',
      SAMPLE_PDF_BUFFER
    );

    const communicationCreateRes = await request(app)
      .post('/api/admin/communications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'GENERAL_INFORMATION',
        priority: 'MEDIUM',
        status: 'DRAFT',
        audience: 'ALL_STUDENTS',
        bacSection: 'MATHEMATIQUES',
        title: `Smoke Communication ${unique}`,
        description: 'Communication created by smoke test',
        contentHtml: '<p>Hello smoke test</p>',
        isVisible: true,
        attachments: [commImage.attachment, commPdf.attachment],
      });

    expect(communicationCreateRes.status).toBe(201);
    created.communicationId = communicationCreateRes.body.item.id;

    const communicationUpdateRes = await request(app)
      .put(`/api/admin/communications/${created.communicationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'GENERAL_INFORMATION',
        priority: 'HIGH',
        status: 'DRAFT',
        audience: 'ALL_STUDENTS',
        bacSection: 'MATHEMATIQUES',
        title: `Smoke Communication Updated ${unique}`,
        description: 'Communication updated by smoke test',
        contentHtml: '<p>Updated content</p>',
        isVisible: false,
        attachments: [commPdf.attachment],
      });

    expect(communicationUpdateRes.status).toBe(200);
    expect(communicationUpdateRes.body.item.title).toContain('Updated');

    const visibilityRes = await request(app)
      .patch(`/api/admin/communications/${created.communicationId}/visibility`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isVisible: true });

    expect(visibilityRes.status).toBe(200);
    expect(visibilityRes.body.item.isVisible).toBe(true);

    const publishRes = await request(app)
      .post(`/api/admin/communications/${created.communicationId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.item.status).toBe('PUBLISHED');

    const duplicateRes = await request(app)
      .post(`/api/admin/communications/${created.communicationId}/duplicate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(duplicateRes.status).toBe(201);
    created.duplicatedCommunicationId = duplicateRes.body.item.id;

    const archiveRes = await request(app)
      .post(`/api/admin/communications/${created.duplicatedCommunicationId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.item.status).toBe('ARCHIVED');

    const communicationListRes = await request(app)
      .get('/api/admin/communications')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: `Smoke Communication Updated ${unique}`, pageSize: 50 });

    expect(communicationListRes.status).toBe(200);
    expect(communicationListRes.body.items.some((item) => item.id === created.communicationId)).toBe(true);

    const coverUpload = await uploadViaPresign(
      '/api/parascolaires/upload-cover/presign',
      `auth-crud-cover-${unique}.png`,
      'image/png',
      SAMPLE_PNG_BUFFER
    );
    const pdfUpload = await uploadViaPresign(
      '/api/parascolaires/upload-pdf/presign',
      `auth-crud-parascolaire-${unique}.pdf`,
      'application/pdf',
      SAMPLE_PDF_BUFFER
    );

    const parascolaireCreateRes = await request(app)
      .post('/api/parascolaires')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Smoke Parascolaire ${unique}`,
        description: 'Parascolaire created by smoke test',
        bacSection: 'MATHEMATIQUES',
        coverImage: coverUpload.fileUrl,
        category: 'Books',
        isFree: false,
        hasPdf: true,
        pdfUrl: pdfUpload.fileUrl,
        pdfPrice: 9.5,
        hasPaperBook: true,
        paperPrice: 19.5,
        paperOrderUrl: 'https://example.com/order',
      });

    expect(parascolaireCreateRes.status).toBe(201);
    created.parascolaireId = parascolaireCreateRes.body.id;

    const parascolaireUpdateRes = await request(app)
      .put(`/api/parascolaires/${created.parascolaireId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Smoke Parascolaire Updated ${unique}`,
        description: 'Parascolaire updated by smoke test',
        bacSection: 'MATHEMATIQUES',
        coverImage: coverUpload.fileUrl,
        category: 'Books',
        isFree: true,
        hasPdf: true,
        pdfUrl: pdfUpload.fileUrl,
        pdfPrice: 0,
        hasPaperBook: false,
        paperPrice: null,
        paperOrderUrl: null,
      });

    expect(parascolaireUpdateRes.status).toBe(200);
    expect(parascolaireUpdateRes.body.title).toContain('Updated');

    const parascolaireGetRes = await request(app)
      .get(`/api/parascolaires/${created.parascolaireId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(parascolaireGetRes.status).toBe(200);
    expect(parascolaireGetRes.body.id).toBe(created.parascolaireId);

    const parascolaireListRes = await request(app)
      .get('/api/parascolaires')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ bacSection: 'MATHEMATIQUES' });

    expect(parascolaireListRes.status).toBe(200);
    expect(parascolaireListRes.body.some((item) => item.id === created.parascolaireId)).toBe(true);

    created.uploadedKeys.push(keyFromPublicUrl(courseContentUrl));
    created.uploadedKeys.push(keyFromPublicUrl(exerciseContentUrl));
    created.uploadedKeys.push(keyFromPublicUrl(commImage.attachment.filePath));
    created.uploadedKeys.push(keyFromPublicUrl(commPdf.attachment.filePath));
    created.uploadedKeys.push(keyFromPublicUrl(coverUpload.fileUrl));
    created.uploadedKeys.push(keyFromPublicUrl(pdfUpload.fileUrl));
  }, 120000);
});
