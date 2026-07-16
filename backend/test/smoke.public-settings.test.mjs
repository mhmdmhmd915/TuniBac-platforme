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

  it('GET /api/settings exposes public platform offer notes and help contacts', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);

    const keys = new Set(res.body.map((item) => item.key));

    expect(keys.has('platformOfferNotesJson')).toBe(true);
    expect(keys.has('contactPhone')).toBe(true);
    expect(keys.has('contactEmail')).toBe(true);
    expect(keys.has('contactAddress')).toBe(true);
  }, 30000);
});

