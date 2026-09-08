// Local backend smoke test for the new Learning Path features.
// Run: node scripts/with-local-db.js node scripts/smoke-new-features.js
const request = require('supertest');

const app = require('../index');
const prisma = require('../lib/prisma');

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

(async () => {
  // Public endpoints
  const steps = await request(app).get('/api/steps');
  check('GET /api/steps (public)', steps.status === 200 && Array.isArray(steps.body.steps) && steps.body.steps.length >= 6, `status=${steps.status} steps=${steps.body.steps?.length}`);

  const shop = await request(app).get('/api/shop');
  check('GET /api/shop (public)', shop.status === 200 && Array.isArray(shop.body), `status=${shop.status} products=${shop.body?.length}`);

  const ads = await request(app).get('/api/teacher-ads');
  check('GET /api/teacher-ads (public)', ads.status === 200 && Array.isArray(ads.body), `status=${ads.status} ads=${ads.body?.length}`);

  const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
  if (teacher) {
    const pub = await request(app).get(`/api/teachers/${teacher.id}/public`);
    check('GET /api/teachers/:id/public', pub.status === 200 && pub.body.teacher, `status=${pub.status}`);
  } else {
    check('GET /api/teachers/:id/public', false, 'no demo teacher');
  }

  // Auth: login as demo teacher
  const loginRes = await request(app).post('/api/auth/login').send({ phone: '+21622222222', password: 'teacher123' });
  const teacherToken = loginRes.body?.token || loginRes.body?.data?.token || null;
  check('teacher login', loginRes.status === 200 && Boolean(teacherToken), `status=${loginRes.status} token=${Boolean(teacherToken)}`);

  if (teacherToken) {
    const me = await request(app).get('/api/teachers/me').set('Authorization', `Bearer ${teacherToken}`);
    check('GET /api/teachers/me', me.status === 200, `status=${me.status} assignments=${me.body?.assignments?.length}`);

    const scope = await request(app).get('/api/teachers/scope').set('Authorization', `Bearer ${teacherToken}`);
    check('GET /api/teachers/scope', scope.status === 200 && Array.isArray(scope.body.subjects), `status=${scope.status} subjects=${scope.body?.subjects?.length}`);

    const lp = await request(app).get('/api/learning-path').set('Authorization', `Bearer ${teacherToken}`);
    check('GET /api/learning-path (teacher)', lp.status === 200 && Array.isArray(lp.body.steps), `status=${lp.status} steps=${lp.body?.steps?.length}`);

    const content = await request(app).get('/api/teachers/content').set('Authorization', `Bearer ${teacherToken}`);
    check('GET /api/teachers/content', content.status === 200 && Array.isArray(content.body.courses), `status=${content.status}`);
  }

  // Admin login
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    const adminLogin = await request(app).post('/api/auth/login').send({ phone: admin.phone || `ADMIN-${admin.id}`, password: 'admin123' });
    const adminToken = adminLogin.body?.token || adminLogin.body?.data?.token || null;
    check('admin login', adminLogin.status === 200 && Boolean(adminToken), `status=${adminLogin.status}`);
    if (adminToken) {
      const adminSteps = await request(app).get('/api/steps/admin/all').set('Authorization', `Bearer ${adminToken}`);
      check('GET /api/steps/admin/all', adminSteps.status === 200, `status=${adminSteps.status}`);

      const teacherList = await request(app).get('/api/admin/teachers').set('Authorization', `Bearer ${adminToken}`);
      check('GET /api/admin/teachers', teacherList.status === 200 && Array.isArray(teacherList.body.teachers), `status=${teacherList.status}`);

      const shopAll = await request(app).get('/api/shop/all').set('Authorization', `Bearer ${adminToken}`);
      check('GET /api/shop/all', shopAll.status === 200, `status=${shopAll.status}`);
    }
  } else {
    check('admin login', false, 'no admin found');
  }

  // Subject list with new fields (optional auth -> student section filter absent; use admin-less call)
  const subjects = await request(app).get('/api/subjects');
  check('GET /api/subjects (public)', subjects.status === 200 && Array.isArray(subjects.body), `status=${subjects.status} count=${subjects.body?.length}`);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nSMOKE RESULT: ${passed} passed, ${failed} failed`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
})().catch(async (err) => {
  console.error('SMOKE ERROR', err);
  await prisma.$disconnect();
  process.exit(1);
});
