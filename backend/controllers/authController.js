const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { resolveRequestedBacSection } = require('../utils/bacSection');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { ensurePublishedTemplatesForStudent } = require('../utils/studentPlannerProvisioning');

// Input validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const signUserToken = (user) =>
  jwt.sign(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
      tokenVersion: Number(user.tokenVersion || 0),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, bacSection } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedLastName = String(lastName || '').trim();
    const normalizedBacSection = resolveRequestedBacSection(bacSection);

    // Validate all inputs
    if (!normalizedEmail || !password || !normalizedFirstName || !normalizedLastName || !normalizedBacSection) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!validateEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password with bcrypt (12 rounds for better security)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        bacSection: normalizedBacSection,
        role: 'STUDENT',
        status: 'PENDING',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bacSection: true,
        role: true,
        status: true,
        createdAt: true,
        tokenVersion: true,
      },
    });

    await ensurePublishedTemplatesForStudent(user.id, user.bacSection);

    // Generate JWT (7 days expiration)
    const token = signUserToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        bacSection: user.bacSection,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    sendError(res, 500, 'Internal server error', error);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Validate inputs
    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update lastLogin
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bacSection: true,
        role: true,
        status: true,
        createdAt: true,
        isVerified: true,
        tokenVersion: true,
      },
    });

    // Generate JWT (7 days expiration)
    const token = signUserToken(updatedUser);

    res.json({
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        bacSection: updatedUser.bacSection,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt
      },
    });
  } catch (error) {
    sendError(res, 500, 'Internal server error', error);
  }
};

const getCurrentUser = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        bacSection: req.user.bacSection,
        role: req.user.role,
        status: req.user.status,
        isVerified: req.user.isVerified,
        createdAt: req.user.createdAt,
      }
    });
  } catch (error) {
    sendError(res, 500, 'Internal server error', error);
  }
};

module.exports = { register, login, getCurrentUser };
