const express = require('express');
const router = express.Router();
const {
  getAllExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  publishExercise,
  reorderExercises,
} = require('../controllers/exerciseController');
const { authMiddleware, roleMiddleware, optionalAuthUserMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthUserMiddleware, getAllExercises);
router.get('/:id', authMiddleware, getExerciseById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), createExercise);
router.put('/reorder', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), reorderExercises);
router.put('/:id/publish', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), publishExercise);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), updateExercise);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), deleteExercise);

module.exports = router;
