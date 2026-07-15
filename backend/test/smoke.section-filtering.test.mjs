import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../index.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

describe('smoke: bac section filtering', () => {
  let adminToken = null;
  const created = {
    userIds: [],
    subjectIds: [],
    courseIds: [],
    communicationIds: [],
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
    if (created.communicationIds.length > 0) {
      await prisma.communication.deleteMany({
        where: { id: { in: created.communicationIds } },
      });
    }

    if (created.courseIds.length > 0) {
      await prisma.course.deleteMany({
        where: { id: { in: created.courseIds } },
      });
    }

    if (created.subjectIds.length > 0) {
      await prisma.subject.deleteMany({
        where: { id: { in: created.subjectIds } },
      });
    }

    if (created.userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: created.userIds } },
      });
    }

    await prisma.$disconnect();
  });

  it('isolates subjects, courses, and communications by student bac section', async () => {
    const unique = Date.now();
    const password = 'section123';

    const names = {
      mathSubject: `Smoke Math Subject ${unique}`,
      techSubject: `Smoke Tech Subject ${unique}`,
      mathCourse: `Smoke Math Course ${unique}`,
      techCourse: `Smoke Tech Course ${unique}`,
      mathCommunication: `Smoke Math Communication ${unique}`,
      techCommunication: `Smoke Tech Communication ${unique}`,
      mathEmail: `smoke-math-${unique}@example.com`,
      techEmail: `smoke-tech-${unique}@example.com`,
    };

    const mathSubjectRes = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: names.mathSubject,
        description: 'Math scoped subject',
        bacSection: 'MATHEMATIQUES',
      });

    expect(mathSubjectRes.status).toBe(201);
    created.subjectIds.push(mathSubjectRes.body.id);

    const techSubjectRes = await request(app)
      .post('/api/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: names.techSubject,
        description: 'Technique scoped subject',
        bacSection: 'TECHNIQUE',
      });

    expect(techSubjectRes.status).toBe(201);
    created.subjectIds.push(techSubjectRes.body.id);

    const mathCourseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: names.mathCourse,
        description: 'Math scoped course',
        difficulty: 'BEGINNER',
        tags: ['math'],
        subjectId: mathSubjectRes.body.id,
      });

    expect(mathCourseRes.status).toBe(201);
    created.courseIds.push(mathCourseRes.body.id);

    const techCourseRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: names.techCourse,
        description: 'Technique scoped course',
        difficulty: 'BEGINNER',
        tags: ['tech'],
        subjectId: techSubjectRes.body.id,
      });

    expect(techCourseRes.status).toBe(201);
    created.courseIds.push(techCourseRes.body.id);

    const mathCommunicationRes = await request(app)
      .post('/api/admin/communications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bacSection: 'MATHEMATIQUES',
        type: 'GENERAL_INFORMATION',
        priority: 'MEDIUM',
        status: 'DRAFT',
        isVisible: true,
        title: names.mathCommunication,
        description: 'Math scoped communication',
        contentHtml: '<p>Math scoped communication</p>',
        attachments: [],
      });

    expect(mathCommunicationRes.status).toBe(201);
    created.communicationIds.push(mathCommunicationRes.body.item.id);

    const techCommunicationRes = await request(app)
      .post('/api/admin/communications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bacSection: 'TECHNIQUE',
        type: 'GENERAL_INFORMATION',
        priority: 'MEDIUM',
        status: 'DRAFT',
        isVisible: true,
        title: names.techCommunication,
        description: 'Technique scoped communication',
        contentHtml: '<p>Technique scoped communication</p>',
        attachments: [],
      });

    expect(techCommunicationRes.status).toBe(201);
    created.communicationIds.push(techCommunicationRes.body.item.id);

    const publishMathRes = await request(app)
      .post(`/api/admin/communications/${mathCommunicationRes.body.item.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    const publishTechRes = await request(app)
      .post(`/api/admin/communications/${techCommunicationRes.body.item.id}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(publishMathRes.status).toBe(200);
    expect(publishTechRes.status).toBe(200);

    const mathRegisterRes = await request(app).post('/api/auth/register').send({
      firstName: 'Math',
      lastName: 'Student',
      email: names.mathEmail,
      password,
      bacSection: 'MATHEMATIQUES',
    });

    expect(mathRegisterRes.status).toBe(201);
    created.userIds.push(mathRegisterRes.body.user.id);

    const techRegisterRes = await request(app).post('/api/auth/register').send({
      firstName: 'Tech',
      lastName: 'Student',
      email: names.techEmail,
      password,
      bacSection: 'TECHNIQUE',
    });

    expect(techRegisterRes.status).toBe(201);
    created.userIds.push(techRegisterRes.body.user.id);

    const approveMathRes = await request(app)
      .put(`/api/admin/users/${mathRegisterRes.body.user.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    const approveTechRes = await request(app)
      .put(`/api/admin/users/${techRegisterRes.body.user.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(approveMathRes.status).toBe(200);
    expect(approveTechRes.status).toBe(200);

    const mathLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: names.mathEmail, password });

    const techLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: names.techEmail, password });

    expect(mathLoginRes.status).toBe(200);
    expect(techLoginRes.status).toBe(200);

    const mathToken = mathLoginRes.body.token;
    const techToken = techLoginRes.body.token;

    const [
      mathSubjectsRes,
      techSubjectsRes,
      mathCoursesRes,
      techCoursesRes,
      mathCommunicationsRes,
      techCommunicationsRes,
    ] = await Promise.all([
      request(app).get('/api/subjects').set('Authorization', `Bearer ${mathToken}`),
      request(app).get('/api/subjects').set('Authorization', `Bearer ${techToken}`),
      request(app).get('/api/courses').set('Authorization', `Bearer ${mathToken}`),
      request(app).get('/api/courses').set('Authorization', `Bearer ${techToken}`),
      request(app).get('/api/communications').set('Authorization', `Bearer ${mathToken}`),
      request(app).get('/api/communications').set('Authorization', `Bearer ${techToken}`),
    ]);

    expect(mathSubjectsRes.status).toBe(200);
    expect(techSubjectsRes.status).toBe(200);
    expect(mathCoursesRes.status).toBe(200);
    expect(techCoursesRes.status).toBe(200);
    expect(mathCommunicationsRes.status).toBe(200);
    expect(techCommunicationsRes.status).toBe(200);

    expect(mathSubjectsRes.body.some((item) => item.name === names.mathSubject)).toBe(true);
    expect(mathSubjectsRes.body.some((item) => item.name === names.techSubject)).toBe(false);
    expect(techSubjectsRes.body.some((item) => item.name === names.techSubject)).toBe(true);
    expect(techSubjectsRes.body.some((item) => item.name === names.mathSubject)).toBe(false);

    expect(mathCoursesRes.body.some((item) => item.title === names.mathCourse)).toBe(true);
    expect(mathCoursesRes.body.some((item) => item.title === names.techCourse)).toBe(false);
    expect(techCoursesRes.body.some((item) => item.title === names.techCourse)).toBe(true);
    expect(techCoursesRes.body.some((item) => item.title === names.mathCourse)).toBe(false);

    expect(
      mathCommunicationsRes.body.items.some((item) => item.title === names.mathCommunication)
    ).toBe(true);
    expect(
      mathCommunicationsRes.body.items.some((item) => item.title === names.techCommunication)
    ).toBe(false);
    expect(
      techCommunicationsRes.body.items.some((item) => item.title === names.techCommunication)
    ).toBe(true);
    expect(
      techCommunicationsRes.body.items.some((item) => item.title === names.mathCommunication)
    ).toBe(false);
  }, 20000);
});
