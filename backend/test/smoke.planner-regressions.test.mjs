import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../index.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

describe('smoke: planner regressions', () => {
  let adminToken = null;
  let mathStudentToken = null;
  let otherStudentToken = null;
  let subjectId = null;

  const created = {
    userIds: [],
    templateIds: [],
    studentTaskIds: [],
    studyTaskIds: [],
    subjectIds: [],
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
    if (created.userIds.length > 0 || created.templateIds.length > 0 || created.studentTaskIds.length > 0) {
      await prisma.studentPlannerTask.deleteMany({
        where: {
          OR: [
            created.studentTaskIds.length > 0 ? { id: { in: created.studentTaskIds } } : undefined,
            created.userIds.length > 0 ? { userId: { in: created.userIds } } : undefined,
            created.templateIds.length > 0 ? { templateId: { in: created.templateIds } } : undefined,
          ].filter(Boolean),
        },
      });
    }

    if (created.studyTaskIds.length > 0) {
      await prisma.studyTask.deleteMany({
        where: { id: { in: created.studyTaskIds } },
      });
    }

    if (created.templateIds.length > 0) {
      await prisma.plannerTemplate.deleteMany({
        where: { id: { in: created.templateIds } },
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

  it('publishes planner templates to targeted students only and preserves mixed legacy planner data', async () => {
    const unique = Date.now();
    const password = 'planner123';
    const mathEmail = `planner-math-${unique}@example.com`;
    const otherEmail = `planner-other-${unique}@example.com`;

    const subjectRes = await request(app)
      .post('/api/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Planner Subject ${unique}`,
        description: 'Planner regression subject',
        color: '#10b981',
        icon: 'book',
        order: 900 + (unique % 100),
        isActive: true,
        bacSection: 'MATHEMATIQUES',
      });

    expect(subjectRes.status).toBe(201);
    subjectId = subjectRes.body.id;
    created.subjectIds.push(subjectId);

    const publishRes = await request(app)
      .post('/api/admin/planner-templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Admin Planner ${unique}`,
        description: 'Published from smoke test',
        dueAt: new Date('2027-01-10T14:30:00.000Z').toISOString(),
        priority: 'HIGH',
        subjectId,
        targetAll: false,
        targetBacSections: ['MATHEMATIQUES'],
        publish: true,
      });

    expect(publishRes.status).toBe(201);
    expect(publishRes.body.id).toBeTruthy();
    created.templateIds.push(publishRes.body.id);
    expect(publishRes.body.publishResult.createdCount).toBeGreaterThanOrEqual(0);

    const registerMathRes = await request(app).post('/api/auth/register').send({
      firstName: 'Planner',
      lastName: 'Math',
      email: mathEmail,
      password,
      bacSection: 'MATHEMATIQUES',
    });
    const registerOtherRes = await request(app).post('/api/auth/register').send({
      firstName: 'Planner',
      lastName: 'Other',
      email: otherEmail,
      password,
      bacSection: 'TECHNIQUE',
    });

    expect(registerMathRes.status).toBe(201);
    expect(registerOtherRes.status).toBe(201);

    created.userIds.push(registerMathRes.body.user.id, registerOtherRes.body.user.id);

    const [assignedOnRegistration, otherSectionAssignments] = await Promise.all([
      prisma.studentPlannerTask.findMany({
        where: {
          userId: registerMathRes.body.user.id,
          templateId: publishRes.body.id,
        },
      }),
      prisma.studentPlannerTask.findMany({
        where: {
          userId: registerOtherRes.body.user.id,
          templateId: publishRes.body.id,
        },
      }),
    ]);

    expect(assignedOnRegistration).toHaveLength(1);
    expect(otherSectionAssignments).toHaveLength(0);

    const approveMathRes = await request(app)
      .put(`/api/admin/users/${registerMathRes.body.user.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    const approveOtherRes = await request(app)
      .put(`/api/admin/users/${registerOtherRes.body.user.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveMathRes.status).toBe(200);
    expect(approveOtherRes.status).toBe(200);

    const loginMathRes = await request(app)
      .post('/api/auth/login')
      .send({ email: mathEmail, password });
    const loginOtherRes = await request(app)
      .post('/api/auth/login')
      .send({ email: otherEmail, password });

    expect(loginMathRes.status).toBe(200);
    expect(loginOtherRes.status).toBe(200);

    mathStudentToken = loginMathRes.body.token;
    otherStudentToken = loginOtherRes.body.token;

    const mathPlannerRes = await request(app)
      .get('/api/student-planner')
      .set('Authorization', `Bearer ${mathStudentToken}`);
    const otherPlannerRes = await request(app)
      .get('/api/student-planner')
      .set('Authorization', `Bearer ${otherStudentToken}`);

    expect(mathPlannerRes.status).toBe(200);
    expect(otherPlannerRes.status).toBe(200);
    const assignedTask = mathPlannerRes.body.find(
      (task) => task.title === `Admin Planner ${unique}` && task.templateId === publishRes.body.id
    );
    expect(
      Boolean(assignedTask)
    ).toBe(true);
    expect(
      otherPlannerRes.body.some((task) => task.title === `Admin Planner ${unique}`)
    ).toBe(false);

    const editCopyRes = await request(app)
      .put(`/api/student-planner/${assignedTask.id}`)
      .set('Authorization', `Bearer ${mathStudentToken}`)
      .send({
        title: `Edited Copy ${unique}`,
        description: 'Student edited copy',
        dueAt: new Date('2027-01-13T00:00:00.000Z').toISOString(),
        priority: 'MEDIUM',
        subjectId,
        attachmentUrl: 'https://example.com/planner-copy.pdf',
        attachmentLabel: 'Planner Copy',
      });

    expect(editCopyRes.status).toBe(200);
    expect(editCopyRes.body.title).toBe(`Edited Copy ${unique}`);
    expect(editCopyRes.body.templateId).toBe(publishRes.body.id);

    const templateAfterStudentEdit = await prisma.plannerTemplate.findUnique({
      where: { id: publishRes.body.id },
    });
    expect(templateAfterStudentEdit.title).toBe(`Admin Planner ${unique}`);
    expect(templateAfterStudentEdit.dueAt.toISOString()).toBe(
      new Date('2027-01-10T14:30:00.000Z').toISOString()
    );

    const deleteCopyRes = await request(app)
      .delete(`/api/student-planner/${assignedTask.id}`)
      .set('Authorization', `Bearer ${mathStudentToken}`);

    expect(deleteCopyRes.status).toBe(403);

    const deletedCopyCheckRes = await request(app)
      .get('/api/student-planner')
      .set('Authorization', `Bearer ${mathStudentToken}`);

    expect(
      deletedCopyCheckRes.body.some((task) => task.id === assignedTask.id)
    ).toBe(true);
    expect(
      await prisma.plannerTemplate.findUnique({ where: { id: publishRes.body.id } })
    ).toBeTruthy();

    const personalTaskRes = await request(app)
      .post('/api/student-planner')
      .set('Authorization', `Bearer ${mathStudentToken}`)
      .send({
        title: `Personal Delete ${unique}`,
        description: 'Personal planner task',
        dueAt: new Date('2027-01-11T09:45:00.000Z').toISOString(),
        priority: 'MEDIUM',
        subjectId,
      });

    expect(personalTaskRes.status).toBe(201);
    created.studentTaskIds.push(personalTaskRes.body.id);

    const deletePersonalRes = await request(app)
      .delete(`/api/student-planner/${personalTaskRes.body.id}`)
      .set('Authorization', `Bearer ${mathStudentToken}`);

    expect(deletePersonalRes.status).toBe(200);
    expect(
      await prisma.studentPlannerTask.findUnique({ where: { id: personalTaskRes.body.id } })
    ).toBeNull();

    const personalTask = await prisma.studentPlannerTask.create({
      data: {
        title: `Existing Personal ${unique}`,
        description: 'Existing personal task',
        dueAt: new Date('2027-01-11T00:00:00.000Z'),
        priority: 'MEDIUM',
        subjectId,
        userId: registerMathRes.body.user.id,
        isPersonal: true,
      },
    });
    created.studentTaskIds.push(personalTask.id);

    const legacyStudyTask = await prisma.studyTask.create({
      data: {
        title: `Legacy Imported ${unique}`,
        description: 'Legacy planner task',
        date: new Date('2027-01-12T00:00:00.000Z'),
        priority: 'LOW',
        subjectId,
        userId: registerMathRes.body.user.id,
      },
    });
    created.studyTaskIds.push(legacyStudyTask.id);

    const migratedPlannerRes = await request(app)
      .get('/api/student-planner')
      .set('Authorization', `Bearer ${mathStudentToken}`);
    const repeatedPlannerRes = await request(app)
      .get('/api/student-planner')
      .set('Authorization', `Bearer ${mathStudentToken}`);

    expect(migratedPlannerRes.status).toBe(200);
    expect(repeatedPlannerRes.status).toBe(200);

    const legacyMatches = repeatedPlannerRes.body.filter(
      (task) => task.title === `Legacy Imported ${unique}` && task.isPersonal === true
    );
    const publishedMatches = repeatedPlannerRes.body.filter(
      (task) => task.templateId === publishRes.body.id
    );
    expect(
      migratedPlannerRes.body.some((task) => task.title === `Existing Personal ${unique}`)
    ).toBe(true);
    expect(legacyMatches).toHaveLength(1);
    expect(publishedMatches).toHaveLength(1);
  }, 20000);
});
