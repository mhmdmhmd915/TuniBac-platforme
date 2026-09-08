const express = require('express');
const router = express.Router();

const { optionalAuthUserMiddleware, authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const {
  createStep,
  deleteStep,
  getAllSteps,
  getPublicStepById,
  getPublicSteps,
  reorderSteps,
  setStepPublish,
  updateStep,
} = require('../controllers/stepController');

// Public (landing preview + logged-in students)
router.get('/', optionalAuthUserMiddleware, getPublicSteps);
router.get('/:id', optionalAuthUserMiddleware, getPublicStepById);

// Admin-only management
router.use('/admin', authMiddleware, roleMiddleware(['ADMIN']));
router.get('/admin/all', getAllSteps);
router.post('/admin', createStep);
router.put('/admin/reorder', reorderSteps);
router.put('/admin/:id', updateStep);
router.put('/admin/:id/publish', setStepPublish);
router.delete('/admin/:id', deleteStep);

module.exports = router;
