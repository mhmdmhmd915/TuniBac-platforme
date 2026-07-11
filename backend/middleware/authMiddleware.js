const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { logger } = require('../utils/logger');

const getTokenVersionValue = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const loadAuthenticatedUser = async (decoded) => {
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      status: true,
      bacSection: true,
      isVerified: true,
      createdAt: true,
      tokenVersion: true,
    }
  });

  if (!user) {
    return { errorMessage: 'User not found' };
  }

  if (getTokenVersionValue(decoded.tokenVersion) !== getTokenVersionValue(user.tokenVersion)) {
    return { errorMessage: 'Token has been revoked' };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      bacSection: user.bacSection,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    },
  };
};

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const loaded = await loadAuthenticatedUser(decoded);
    if (!loaded.user) {
      return res.status(401).json({ message: loaded.errorMessage || 'Token is not valid' });
    }

    req.user = loaded.user;
    next();
  } catch (error) {
    logger.error('Auth middleware error', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const authMiddleware = (req, res, next) => {
  authenticateUser(req, res, () => {
    if (req.user.role !== 'ADMIN' && req.user.status !== 'APPROVED') {
      return res.status(403).json({ message: 'Account not approved or suspended', status: req.user.status });
    }
    next();
  });
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied, admin only' });
  }
  next();
};

const authUserMiddleware = authenticateUser;

const optionalAuthUserMiddleware = async (req, _res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const loaded = await loadAuthenticatedUser(decoded);
    req.user = loaded.user || null;
  } catch (_error) {
    req.user = null;
  }

  next();
};

// Optional: Role-based middleware factory
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  authUserMiddleware,
  optionalAuthUserMiddleware,
  adminMiddleware,
  roleMiddleware,
};
