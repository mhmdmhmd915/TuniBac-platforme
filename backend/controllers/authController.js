const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { resolveRequestedBacSection } = require('../utils/bacSection');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { ensurePublishedTemplatesForStudent } = require('../utils/studentPlannerProvisioning');
const {
  normalizeTunisianPhone,
} = require('../utils/tunisianPhone');

const validatePassword = (password) => password && password.length >= 6;

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
    const { password, firstName, lastName, phone, bacSection } = req.body;
    const normalizedPhone = normalizeTunisianPhone(phone);
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedLastName = String(lastName || '').trim();
    const normalizedBacSection = resolveRequestedBacSection(bacSection);

    if (!phone || !password || !normalizedFirstName || !normalizedLastName || !normalizedBacSection) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Invalid Tunisian mobile phone number' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        password: hashedPassword,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phone: normalizedPhone,
        bacSection: normalizedBacSection,
        role: 'STUDENT',
        status: 'PENDING',
      },
      select: {
        id: true,
        email: true,
        phone: true,
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

    const token = signUserToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        bacSection: user.bacSection,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    sendError(res, 500, 'Internal server error', error);
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const normalizedPhone = normalizeTunisianPhone(phone);

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone number and password are required' });
    }

    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Invalid Tunisian mobile phone number' });
    }

    const user = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
      select: {
        id: true,
        email: true,
        phone: true,
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

    const token = signUserToken(updatedUser);

    res.json({
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        bacSection: updatedUser.bacSection,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
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
        phone: req.user.phone,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        bacSection: req.user.bacSection,
        role: req.user.role,
        status: req.user.status,
        isVerified: req.user.isVerified,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    sendError(res, 500, 'Internal server error', error);
  }
};

module.exports = { register, login, getCurrentUser };
