const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const corsMiddleware = require('./config/cors');
const { validateServerEnv } = require('./config/env');
const { sendError, isProduction } = require('./utils/http');
const { logger } = require('./utils/logger');

dotenv.config({ path: path.join(__dirname, '.env') });
const localEnv = dotenv.config({ path: path.join(__dirname, '.env.local') });

if (localEnv.parsed) {
  for (const [key, value] of Object.entries(localEnv.parsed)) {
    if (typeof process.env[key] === 'string' && process.env[key].trim()) {
      continue;
    }

    process.env[key] = value;
  }
}

validateServerEnv();

const app = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});

app.use(corsMiddleware);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '2mb' }));

const rateLimit = new Map();
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 250);
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 30);
const CONTACT_RATE_LIMIT_MAX = Number(process.env.CONTACT_RATE_LIMIT_MAX_REQUESTS || 20);

const RATE_LIMIT_RULES = [
  { test: (req) => req.path.startsWith('/api/auth/login'), maxRequests: AUTH_RATE_LIMIT_MAX },
  { test: (req) => req.path.startsWith('/api/auth/register'), maxRequests: AUTH_RATE_LIMIT_MAX },
  { test: (req) => req.path.startsWith('/api/contact'), maxRequests: CONTACT_RATE_LIMIT_MAX },
];

const shouldSkipRateLimit = (req) => {
  if (!isProduction) {
    return true;
  }

  if (req.method === 'OPTIONS') {
    return true;
  }

  const pathValue = req.path || '';
  return pathValue === '/' || pathValue === '/test';
};

const cleanupExpiredRateLimits = () => {
  const now = Date.now();
  for (const [key, entry] of rateLimit.entries()) {
    if (!entry || now - entry.startTime > RATE_LIMIT_WINDOW) {
      rateLimit.delete(key);
    }
  }
};

setInterval(cleanupExpiredRateLimits, RATE_LIMIT_WINDOW).unref?.();

const getRateLimitMaxRequests = (req) => {
  const matchedRule = RATE_LIMIT_RULES.find((rule) => rule.test(req));
  return matchedRule?.maxRequests || MAX_REQUESTS;
};

app.use((req, res, next) => {
  if (shouldSkipRateLimit(req)) {
    return next();
  }

  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const maxRequests = getRateLimitMaxRequests(req);
  const existing = rateLimit.get(clientIp);

  if (!existing || now - existing.startTime > RATE_LIMIT_WINDOW) {
    rateLimit.set(clientIp, { count: 1, startTime: now });
    return next();
  }

  existing.count += 1;
  rateLimit.set(clientIp, existing);

  if (existing.count > maxRequests) {
    return res.status(429).json({ message: 'Too many requests, please try again later' });
  }

  return next();
});

app.get('/test', (_req, res) => {
  res.send('TEST OK');
});

app.get('/', (_req, res) => {
  res.json({ message: 'Welcome to TuniBac API', version: '1.0.0' });
});

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const userRoutes = require('./routes/users');
const exerciseRoutes = require('./routes/exercises');
const homeworkRoutes = require('./routes/homework');
const adminRoutes = require('./routes/admin');
const adminCommunicationRoutes = require('./routes/adminCommunications');
const plannerRoutes = require('./routes/planner');
const studentPlannerRoutes = require('./routes/studentPlanner');
const parascolairesRoutes = require('./routes/parascolaires');
const subjectRoutes = require('./routes/subjects');
const contactRoutes = require('./routes/contact');
const communicationRoutes = require('./routes/communications');
const settingsRoutes = require('./routes/settings');

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/communications', adminCommunicationRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/student-planner', studentPlannerRoutes);
app.use('/api/parascolaires', parascolairesRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, _req, res, _next) => {
  logger.error('Unhandled server error', err);

  if (err?.name === 'MulterError') {
    return sendError(res, 400, 'Upload failed', err);
  }

  if (
    err?.message === 'Invalid file type' ||
    err?.message === 'Invalid file extension' ||
    err?.message === 'File too large' ||
    err?.message === 'File signature does not match the declared file type' ||
    err?.message === 'Stored file exceeds the allowed size' ||
    err?.message === 'Not allowed by CORS'
  ) {
    return sendError(res, 400, err.message, err);
  }

  return sendError(res, 500, 'Internal server error', err);
});

app.use('*', (_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('Server started', {
      port: PORT,
      environment: isProduction ? 'production' : process.env.NODE_ENV || 'development',
      production: isProduction,
    });
  });
}

module.exports = app;
