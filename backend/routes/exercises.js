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
  getCorrection,
  upsertCorrection,
  deleteCorrection,
} = require('../controllers/exerciseController');
const { authMiddleware, roleMiddleware, optionalAuthUserMiddleware, bacOnlyMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthUserMiddleware, bacOnlyMiddleware, getAllExercises);
router.get('/:id', authMiddleware, bacOnlyMiddleware, getExerciseById);
router.post('/', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), createExercise);
router.put('/reorder', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), reorderExercises);
router.put('/:id/publish', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), publishExercise);
router.get('/:id/corrections/:correctionId', authMiddleware, bacOnlyMiddleware, getCorrection);
router.put('/:id/corrections/:correctionId', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), upsertCorrection);
router.delete('/:id/corrections/:correctionId', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), deleteCorrection);
router.put('/:id', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), updateExercise);
router.delete('/:id', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), deleteExercise);

module.exports = router;
