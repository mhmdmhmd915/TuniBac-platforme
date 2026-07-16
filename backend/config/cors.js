const cors = require('cors');

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:4174',
  'http://0.0.0.0:5173',
  'http://0.0.0.0:5174',
  'http://0.0.0.0:4173',
  'http://0.0.0.0:4174',
  'https://www.tunibac.com',
  'https://tunibac.com',
  'https://tunibac-frontend.onrender.com',
];

const configuredOrigins = String(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

module.exports = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
