import { describe, expect, it } from 'vitest';

import allowedOriginsModule from '../config/allowedOrigins.js';

const { getAllowedOrigins } = allowedOriginsModule;

describe('smoke: upload origins', () => {
  it('includes every production frontend origin used for R2 uploads', () => {
    const origins = new Set(getAllowedOrigins());

    expect(origins.has('https://www.tunibac.com')).toBe(true);
    expect(origins.has('https://tunibac.com')).toBe(true);
    expect(origins.has('https://tunibac-frontend.onrender.com')).toBe(true);
  });
});
