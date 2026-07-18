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
    '<< /Length 44 >>',
    'stream',
    'BT /F1 18 Tf 40 120 Td (Misc upload smoke) Tj ET',
    'endstream',
    'endobj',
    'trailer',
    '<< /Root 1 0 R >>',
    '%%EOF',
  ].join('\n'),
  'utf8'
);

const REPLACEMENT_PDF_BUFFER = Buffer.from(
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
    '<< /Length 70 >>',
    'stream',
    'BT /F1 18 Tf 40 120 Td (Replacement upload smoke with longer content) Tj ET',
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

describe('smoke: misc uploads and upload management', () => {
  let adminToken = null;
  const created = {
    courseId: null,
    exerciseId: null,
    courseResourceId: null,
    exerciseResourceId: null,
    uploadedKeys: [],
  };

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+21620000000', password: 'admin123' });

    if (loginRes.status !== 200 || !loginRes.body?.token) {
      throw new Error(`Admin login failed with status ${loginRes.status}`);
    }

    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    if (created.courseResourceId) {
      await request(app)
        .delete(`/api/admin/resources/${created.courseResourceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    if (created.exerciseResourceId) {
      await request(app)
        .delete(`/api/admin/exercise-resources/${created.exerciseResourceId}`)
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

    for (const key of created.uploadedKeys) {
      await request(app)
        .delete('/api/admin/uploads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ path: key, force: true });
    }

    await prisma.$disconnect();
  }, 120000);

  it('covers settings images, resources, list, replace and delete upload flows', async () => {
    const subject = await prisma.subject.findFirst({ orderBy: { createdAt: 'asc' } });
    expect(subject).toBeTruthy();
    const unique = Date.now();

    const uploadPdfViaPresign = async (route, filename) => {
      const presignRes = await request(app)
        .post(route)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          filename,
          contentType: 'application/pdf',
          sizeBytes: SAMPLE_PDF_BUFFER.length,
        });

      expect(presignRes.status).toBe(200);

      const putRes = await axios.put(presignRes.body.uploadUrl, SAMPLE_PDF_BUFFER, {
        headers: { 'Content-Type': 'application/pdf' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0,
        validateStatus: () => true,
      });

      expect(putRes.status).toBeGreaterThanOrEqual(200);
      expect(putRes.status).toBeLessThan(300);
      return presignRes.body.fileUrl;
    };

    const logoRes = await request(app)
      .post('/api/admin/settings/upload/logo')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', SAMPLE_PNG_BUFFER, {
        filename: `logo-${unique}.png`,
        contentType: 'image/png',
      });

    expect(logoRes.status).toBe(200);
    expect(typeof logoRes.body.fileUrl).toBe('string');
    const logoHead = await fetch(logoRes.body.fileUrl, { method: 'HEAD' });
    expect(logoHead.status).toBe(200);
    expect(logoHead.headers.get('content-type')).toContain('image/png');
    created.uploadedKeys.push(keyFromPublicUrl(logoRes.body.fileUrl));

    const faviconRes = await request(app)
      .post('/api/admin/settings/upload/favicon')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', SAMPLE_PNG_BUFFER, {
        filename: `favicon-${unique}.png`,
        contentType: 'image/png',
      });

    expect(faviconRes.status).toBe(200);
    expect(typeof faviconRes.body.fileUrl).toBe('string');
    const faviconHead = await fetch(faviconRes.body.fileUrl, { method: 'HEAD' });
    expect(faviconHead.status).toBe(200);
    expect(faviconHead.headers.get('content-type')).toContain('image/png');
    created.uploadedKeys.push(keyFromPublicUrl(faviconRes.body.fileUrl));

    const coursePdfUrl = await uploadPdfViaPresign(
      '/api/admin/courses/upload-pdf/presign',
      `misc-course-${unique}.pdf`
    );
    const courseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Misc course ${unique}`,
        description: 'Course for resource smoke',
        contentUrl: coursePdfUrl,
        difficulty: 'BEGINNER',
        tags: ['misc', 'resource'],
        subjectId: subject.id,
      });

    expect(courseRes.status).toBe(201);
    created.courseId = courseRes.body.id;

    const exercisePdfUrl = await uploadPdfViaPresign(
      '/api/admin/exercises/upload-pdf/presign',
      `misc-exercise-${unique}.pdf`
    );
    const exerciseRes = await request(app)
      .post('/api/exercises')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Misc exercise ${unique}`,
        description: 'Exercise for resource smoke',
        contentUrl: exercisePdfUrl,
        difficulty: 'BEGINNER',
        subjectId: subject.id,
      });

    expect(exerciseRes.status).toBe(201);
    created.exerciseId = exerciseRes.body.id;

    const courseResourceUrl = await uploadPdfViaPresign(
      '/api/admin/courses/upload-pdf/presign',
      `misc-course-resource-${unique}.pdf`
    );
    const courseResourceRes = await request(app)
      .post('/api/admin/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Course resource ${unique}`,
        url: courseResourceUrl,
        type: 'PDF',
        courseId: created.courseId,
      });

    expect(courseResourceRes.status).toBe(200);
    expect(typeof courseResourceRes.body.url).toBe('string');
    created.courseResourceId = courseResourceRes.body.id;
    const courseResourceKey = keyFromPublicUrl(courseResourceRes.body.url);

    const exerciseResourceUrl = await uploadPdfViaPresign(
      '/api/admin/exercises/upload-pdf/presign',
      `misc-exercise-resource-${unique}.pdf`
    );
    const exerciseResourceRes = await request(app)
      .post('/api/admin/exercise-resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Exercise resource ${unique}`,
        url: exerciseResourceUrl,
        type: 'PDF',
        exerciseId: created.exerciseId,
      });

    expect(exerciseResourceRes.status).toBe(200);
    expect(typeof exerciseResourceRes.body.url).toBe('string');
    created.exerciseResourceId = exerciseResourceRes.body.id;
    const exerciseResourceKey = keyFromPublicUrl(exerciseResourceRes.body.url);

    const courseDetailRes = await request(app)
      .get(`/api/courses/${created.courseId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(courseDetailRes.status).toBe(200);
    expect(courseDetailRes.body.resources.some((item) => item.id === created.courseResourceId)).toBe(true);

    const exerciseDetailRes = await request(app)
      .get(`/api/exercises/${created.exerciseId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(exerciseDetailRes.status).toBe(200);
    expect(exerciseDetailRes.body.resources.some((item) => item.id === created.exerciseResourceId)).toBe(true);

    const uploadsListRes = await request(app)
      .get('/api/admin/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ q: courseResourceKey, limit: 1000 });

    expect(uploadsListRes.status).toBe(200);
    expect(uploadsListRes.body.items.some((item) => item.path === courseResourceKey)).toBe(true);

    const deleteInUseRes = await request(app)
      .delete('/api/admin/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ path: courseResourceKey });

    expect(deleteInUseRes.status).toBe(409);
    expect(deleteInUseRes.body.message).toBe('File is in use');

    const replaceRes = await request(app)
      .post('/api/admin/uploads/replace')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('targetPath', courseResourceKey)
      .attach('file', REPLACEMENT_PDF_BUFFER, {
        filename: `replacement-${unique}.pdf`,
        contentType: 'application/pdf',
      });

    expect(replaceRes.status).toBe(200);
    expect(replaceRes.body.item.path).toBe(courseResourceKey);

    const replacedHeadRes = await fetch(courseResourceRes.body.url, { method: 'HEAD' });
    expect(replacedHeadRes.status).toBe(200);
    expect(Number(replacedHeadRes.headers.get('content-length'))).toBe(REPLACEMENT_PDF_BUFFER.length);

    const forceDeleteRes = await request(app)
      .delete('/api/admin/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ path: exerciseResourceKey, force: true });

    expect(forceDeleteRes.status).toBe(200);
    const exerciseAfterDeleteRes = await request(app)
      .get(`/api/exercises/${created.exerciseId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(exerciseAfterDeleteRes.status).toBe(200);
    expect(exerciseAfterDeleteRes.body.resources.some((item) => item.id === created.exerciseResourceId)).toBe(false);

    const deletedHeadRes = await fetch(exerciseResourceRes.body.url, { method: 'HEAD' });
    expect(deletedHeadRes.status).toBe(404);
    created.exerciseResourceId = null;
  }, 120000);
});
