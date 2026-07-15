import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import axios from 'axios';
import https from 'https';
import request from 'supertest';

import app from '../index.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();
const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

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
    'BT /F1 18 Tf 40 120 Td (Smoke PDF) Tj ET',
    'endstream',
    'endobj',
    'trailer',
    '<< /Root 1 0 R >>',
    '%%EOF',
  ].join('\n'),
  'utf8'
);

const keyFromPublicUrl = (url) => new URL(String(url)).pathname.replace(/^\/+/, '');

describe('smoke: pdf uploads by bac section', () => {
  let adminToken = null;
  const created = {
    subjectIds: [],
    courseIds: [],
    exerciseIds: [],
    uploadKeys: [],
  };

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gmail.com', password: 'admin123' });

    if (res.status !== 200 || !res.body?.token) {
      throw new Error(
        `Admin login failed (status ${res.status}). Run backend seed and ensure JWT_SECRET/DATABASE_URL are set.`
      );
    }

    adminToken = res.body.token;
  });

  afterAll(async () => {
    if (created.exerciseIds.length > 0) {
      for (const id of created.exerciseIds) {
        await request(app)
          .delete(`/api/exercises/${id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    }

    if (created.courseIds.length > 0) {
      for (const id of created.courseIds) {
        await request(app)
          .delete(`/api/courses/${id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    }

    if (created.subjectIds.length > 0) {
      await prisma.subject.deleteMany({
        where: { id: { in: created.subjectIds } },
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
  }, 60000);

  it('uploads PDF for courses, exercises and corrections across all sections', async () => {
    const unique = Date.now();
    const perSection = new Map();

    const uploadViaPresign = async (route, filename) => {
      const presignRes = await request(app)
        .post(route)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          filename,
          contentType: 'application/pdf',
          sizeBytes: SAMPLE_PDF_BUFFER.length,
        });

      expect(presignRes.status).toBe(200);
      expect(typeof presignRes.body.uploadUrl).toBe('string');
      expect(typeof presignRes.body.fileUrl).toBe('string');

      const putRes = await axios.put(presignRes.body.uploadUrl, SAMPLE_PDF_BUFFER, {
        headers: {
          'Content-Type': 'application/pdf',
        },
        httpsAgent: ipv4Agent,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 0,
        validateStatus: () => true,
      });

      expect(putRes.status).toBeGreaterThanOrEqual(200);
      expect(putRes.status).toBeLessThan(300);

      const headRes = await fetch(presignRes.body.fileUrl, { method: 'HEAD' });
      expect(headRes.status).toBe(200);
      expect(headRes.headers.get('content-type')).toContain('application/pdf');

      return presignRes.body.fileUrl;
    };

    for (const section of SECTIONS) {
      const subjectRes = await request(app)
        .post('/api/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Smoke PDF Subject ${section} ${unique}`,
          description: `Subject for ${section}`,
          bacSection: section,
        });

      expect(subjectRes.status).toBe(201);
      created.subjectIds.push(subjectRes.body.id);

      const coursePdfUrl = await uploadViaPresign(
        '/api/admin/courses/upload-pdf/presign',
        `course-${section}-${unique}.pdf`
      );

      const courseRes = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Smoke PDF Course ${section} ${unique}`,
          description: `Course for ${section}`,
          difficulty: 'BEGINNER',
          tags: ['pdf', section.toLowerCase()],
          contentUrl: coursePdfUrl,
          subjectId: subjectRes.body.id,
        });

      expect(courseRes.status).toBe(201);
      expect(courseRes.body.contentUrl).toBe(coursePdfUrl);
      created.courseIds.push(courseRes.body.id);

      const exercisePdfUrl = await uploadViaPresign(
        '/api/admin/exercises/upload-pdf/presign',
        `exercise-${section}-${unique}.pdf`
      );

      const exerciseRes = await request(app)
        .post('/api/exercises')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: `Smoke PDF Exercise ${section} ${unique}`,
          description: `Exercise for ${section}`,
          difficulty: 'BEGINNER',
          contentUrl: exercisePdfUrl,
          subjectId: subjectRes.body.id,
        });

      expect(exerciseRes.status).toBe(201);
      expect(exerciseRes.body.contentUrl).toBe(exercisePdfUrl);
      created.exerciseIds.push(exerciseRes.body.id);

      const correctionRes = await request(app)
        .post('/api/admin/exercise-correction')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('exerciseId', exerciseRes.body.id)
        .field('title', `Correction ${section}`)
        .attach('pdf', SAMPLE_PDF_BUFFER, {
          filename: `correction-${section}-${unique}.pdf`,
          contentType: 'application/pdf',
        });

      expect(correctionRes.status).toBe(200);
      expect(correctionRes.body.title).toBe(`Correction ${section}`);
      expect(typeof correctionRes.body.contentUrl).toBe('string');

      const correctionHeadRes = await fetch(correctionRes.body.contentUrl, { method: 'HEAD' });
      expect(correctionHeadRes.status).toBe(200);
      expect(correctionHeadRes.headers.get('content-type')).toContain('application/pdf');

      const verifyExerciseRes = await request(app)
        .get(`/api/exercises/${exerciseRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyExerciseRes.status).toBe(200);
      expect(
        verifyExerciseRes.body.corrections.some(
          (item) => item.title === `Correction ${section}` && item.contentUrl === correctionRes.body.contentUrl
        )
      ).toBe(true);

      perSection.set(section, {
        courseTitle: courseRes.body.title,
        exerciseTitle: exerciseRes.body.title,
      });
    }

    for (const section of SECTIONS) {
      const courseListRes = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ bacSection: section });

      const exerciseListRes = await request(app)
        .get('/api/exercises')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ bacSection: section });

      expect(courseListRes.status).toBe(200);
      expect(exerciseListRes.status).toBe(200);

      const current = perSection.get(section);

      expect(courseListRes.body.some((item) => item.title === current.courseTitle)).toBe(true);
      expect(exerciseListRes.body.some((item) => item.title === current.exerciseTitle)).toBe(true);

      for (const [otherSection, otherValues] of perSection.entries()) {
        if (otherSection === section) continue;
        expect(courseListRes.body.some((item) => item.title === otherValues.courseTitle)).toBe(false);
        expect(exerciseListRes.body.some((item) => item.title === otherValues.exerciseTitle)).toBe(false);
      }
    }
  }, 120000);
});
