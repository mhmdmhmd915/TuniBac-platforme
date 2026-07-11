import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../index.js';

describe('smoke: auth + admin', () => {
  it('GET /test returns TEST OK', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.text).toBe('TEST OK');
  });

  let adminToken = null;

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

  it('GET /api/admin/users requires auth and returns paginated response', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&pageSize=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(5);
  });
});

