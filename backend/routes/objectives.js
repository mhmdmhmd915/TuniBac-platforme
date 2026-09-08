const express = require('express');
const router = express.Router();
const {
  listMyObjectives,
  getObjective,
  createObjective,
  updateObjective,
  deleteObjective,
  markCompleted,
} = require('../controllers/objectiveController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, listMyObjectives);
router.post('/', authMiddleware, createObjective);
router.get('/:id', authMiddleware, getObjective);
router.put('/:id', authMiddleware, updateObjective);
router.delete('/:id', authMiddleware, deleteObjective);
router.post('/:id/complete', authMiddleware, markCompleted);

module.exports = router;
