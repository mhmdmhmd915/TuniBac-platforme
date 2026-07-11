const express = require('express');
const router = express.Router();
const { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { authMiddleware, adminMiddleware, optionalAuthUserMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthUserMiddleware, getAllCourses);
router.get('/:id', authMiddleware, getCourseById);
router.post('/', authMiddleware, adminMiddleware, createCourse);
router.put('/:id', authMiddleware, adminMiddleware, updateCourse);
router.delete('/:id', authMiddleware, adminMiddleware, deleteCourse);

module.exports = router;
