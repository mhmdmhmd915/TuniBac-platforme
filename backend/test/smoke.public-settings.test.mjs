import { describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../index.js';

describe('smoke: public settings', () => {
  it('GET /api/settings returns settings array and platformName', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const platformName = res.body.find((x) => x.key === 'platformName')?.value;
    expect(typeof platformName).toBe('string');
  }, 30000);
});

