const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');
const { resolveRequestedBacSection } = require('../utils/bacSection');
const { normalizeTunisianPhone } = require('../utils/tunisianPhone');

const listTeachers = async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER',
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        bacSection: true,
        createdAt: true,
        teacherProfile: {
          select: { id: true, photo: true, bio: true, whatsapp: true, externalLink: true, isPublic: true },
        },
        teacherAssignments: {
          include: { subject: { select: { id: true, name: true } } },
        },
        _count: {
          select: {
            ownedCourses: true,
            ownedExercises: true,
          },
        },
      },
    });

    res.json({
      teachers: teachers.map((t) => ({
        ...t,
        teacherAssignments: t.teacherAssignments.map((a) => ({
          id: a.id,
          subjectId: a.subjectId,
          subjectName: a.subject?.name || null,
          bacSection: a.bacSection,
        })),
      })),
    });
  } catch (error) {
    logger.error('Error listing teachers', error);
    sendError(res, 500, 'Error listing teachers', error);
  }
};

const getTeacherDetail = async (req, res) => {
  try {
    const teacher = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'TEACHER' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        bacSection: true,
        createdAt: true,
        teacherProfile: true,
        teacherAssignments: {
          include: { subject: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.json({ teacher });
  } catch (error) {
    logger.error('Error fetching teacher detail', error);
    sendError(res, 500, 'Error fetching teacher detail', error);
  }
};

const setTeacherAssignments = async (req, res) => {
  try {
    const teacher = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'TEACHER' },
      select: { id: true },
    });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const assignments = Array.isArray(req.body.assignments) ? req.body.assignments : [];

    // Validate each assignment
    const validAssignments = [];
    for (const item of assignments) {
      const subjectId = item.subjectId ? String(item.subjectId) : null;
      const bacSection = resolveRequestedBacSection(item.bacSection);

      if (subjectId) {
        const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
        if (!subject) {
          return res.status(400).json({ message: `Unknown subject: ${subjectId}` });
        }
        validAssignments.push({ subjectId, bacSection: bacSection || null });
      } else if (bacSection) {
        validAssignments.push({ subjectId: null, bacSection });
      }
    }

    await prisma.$transaction([
      prisma.teacherAssignment.deleteMany({ where: { teacherId: req.params.id } }),
      ...validAssignments.map((assignment) =>
        prisma.teacherAssignment.create({
          data: { teacherId: req.params.id, ...assignment },
        })
      ),
    ]);

    res.json({ message: 'Teacher assignments updated successfully' });
  } catch (error) {
    logger.error('Error updating teacher assignments', error);
    sendError(res, 500, 'Error updating teacher assignments', error);
  }
};

const createTeacher = async (req, res) => {
  try {
    const { firstName, lastName, phone, password, email, bacSection } = req.body;
    const normalizedPhone = normalizeTunisianPhone(phone);
    const normalizedFirstName = String(firstName || '').trim();
    const normalizedLastName = String(lastName || '').trim();
    const normalizedEmail = email && String(email).trim() ? String(email).trim() : null;
    const normalizedBacSection = bacSection ? resolveRequestedBacSection(bacSection) : null;

    if (!normalizedFirstName) {
      return res.status(400).json({ message: 'First name is required' });
    }
    if (!normalizedLastName) {
      return res.status(400).json({ message: 'Last name is required' });
    }
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'Invalid Tunisian mobile phone number' });
    }
    if (!password || password.length < 6) {
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
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        phone: normalizedPhone,
        password: hashedPassword,
        email: normalizedEmail,
        bacSection: normalizedBacSection,
        role: 'TEACHER',
        status: 'APPROVED',
        teacherProfile: {
          create: {},
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        bacSection: true,
        role: true,
        status: true,
        createdAt: true,
        teacherProfile: {
          select: { id: true },
        },
      },
    });

    res.status(201).json({
      user,
      message: 'Teacher created successfully',
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }
    logger.error('Error creating teacher', error);
    sendError(res, 500, 'Error creating teacher', error);
  }
};

module.exports = { listTeachers, getTeacherDetail, setTeacherAssignments, createTeacher };
