const REQUIRED_SERVER_ENV = ['DATABASE_URL', 'JWT_SECRET'];

const validateServerEnv = () => {
  const missing = REQUIRED_SERVER_ENV.filter((key) => {
    const value = process.env[key];
    return typeof value !== 'string' || !value.trim();
  });

  if (missing.length > 0) {
    throw new Error(`Missing required server env vars: ${missing.join(', ')}`);
  }
};

module.exports = {
  validateServerEnv,
};
