const prisma = require('../lib/prisma');

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bacSection: true,
        role: true,
        isVerified: true,
        createdAt: true
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName },
      select: { id: true, email: true, firstName: true, lastName: true, bacSection: true, role: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const courseCount = await prisma.progressTracking.count({
      where: { userId, courseId: { not: null }, completed: true },
    });
    const exerciseCount = await prisma.progressTracking.count({
      where: { userId, exerciseId: { not: null }, completed: true },
    });
    
    res.json({ coursesCompleted: courseCount, exercisesCompleted: exerciseCount });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

module.exports = { getProfile, updateProfile, getStats };

