const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  reorderCourses,
} = require('../controllers/courseController');
const { authMiddleware, roleMiddleware, optionalAuthUserMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthUserMiddleware, getAllCourses);
router.get('/:id', authMiddleware, getCourseById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), createCourse);
router.put('/reorder', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), reorderCourses);
router.put('/:id/publish', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), publishCourse);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), updateCourse);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), deleteCourse);

module.exports = router;
