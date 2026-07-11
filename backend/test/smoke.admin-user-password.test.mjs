import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../index.js';

describe('smoke: admin user password reset', () => {
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

  it('admin can reset user password and user can login with new password', async () => {
    const email = `smoke-user-${Date.now()}@example.com`;
    const initialPassword = 'initial123';
    const newPassword = 'newpass123';

    const registerRes = await request(app).post('/api/auth/register').send({
      firstName: 'Smoke',
      lastName: 'User',
      email,
      password: initialPassword,
      bacSection: 'SCIENCES_EXPERIMENTALES',
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body?.user?.id).toBeTruthy();
    const userId = registerRes.body.user.id;
    const originalToken = registerRes.body.token;

    const resetRes = await request(app)
      .put(`/api/admin/users/${userId}/password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: newPassword });

    expect(resetRes.status).toBe(200);

    const revokedTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${originalToken}`);

    expect(revokedTokenRes.status).toBe(401);
    expect(revokedTokenRes.body?.message).toBe('Token has been revoked');

    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: newPassword,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body?.token).toBeTruthy();

    await request(app)
      .delete(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });
});
