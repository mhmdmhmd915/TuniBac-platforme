import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../index.js';

describe('smoke: admin uploads', () => {
  let adminToken = null;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+21620000000', password: 'admin123' });

    if (res.status !== 200 || !res.body?.token) {
      throw new Error(
        `Admin login failed (status ${res.status}). Run backend seed and ensure JWT_SECRET/DATABASE_URL are set.`
      );
    }

    adminToken = res.body.token;
  });

  it('GET /api/admin/uploads requires auth', async () => {
    const res = await request(app).get('/api/admin/uploads');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/uploads returns {items,total}', async () => {
    const res = await request(app)
      .get('/api/admin/uploads?limit=50')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('POST /api/admin/uploads/video rejects missing file', async () => {
    const res = await request(app)
      .post('/api/admin/uploads/video')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  it('DELETE /api/admin/uploads validates path', async () => {
    const res = await request(app)
      .delete('/api/admin/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ path: '../secrets.txt' });

    expect(res.status).toBe(400);
  });

  it('DELETE /api/admin/uploads returns 404 for missing file', async () => {
    const res = await request(app)
      .delete('/api/admin/uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ path: 'does-not-exist.txt' });

    expect(res.status).toBe(404);
  });
});

