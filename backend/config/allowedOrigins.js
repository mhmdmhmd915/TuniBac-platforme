const DEFAULT_ALLOWED_ORIGINS = [
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

const parseOrigins = (...values) =>
  values
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);

const getAllowedOrigins = () => [
  ...new Set(
    DEFAULT_ALLOWED_ORIGINS.concat(
      parseOrigins(
        process.env.CORS_ORIGINS,
        process.env.CORS_ORIGIN,
        process.env.R2_CORS_ORIGINS
      )
    )
  ),
];

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  getAllowedOrigins,
};
