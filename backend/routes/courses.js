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
const { authMiddleware, roleMiddleware, optionalAuthUserMiddleware, bacOnlyMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthUserMiddleware, bacOnlyMiddleware, getAllCourses);
router.get('/:id', authMiddleware, bacOnlyMiddleware, getCourseById);
router.post('/', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), createCourse);
router.put('/reorder', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), reorderCourses);
router.put('/:id/publish', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), publishCourse);
router.put('/:id', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), updateCourse);
router.delete('/:id', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), deleteCourse);

module.exports = router;
