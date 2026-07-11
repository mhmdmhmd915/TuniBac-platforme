const express = require('express');
const router = express.Router();
const { getAllExercises, getExerciseById, createExercise, updateExercise, deleteExercise } = require('../controllers/exerciseController');
const { authMiddleware, adminMiddleware, optionalAuthUserMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthUserMiddleware, getAllExercises);
router.get('/:id', authMiddleware, getExerciseById);
router.post('/', authMiddleware, adminMiddleware, createExercise);
router.put('/:id', authMiddleware, adminMiddleware, updateExercise);
router.delete('/:id', authMiddleware, adminMiddleware, deleteExercise);

module.exports = router;
