const express = require('express');
const router = express.Router();
const {
  getMyProgress,
  upsertProgress,
  markCompleted,
  getMyProgressAggregate,
} = require('../controllers/progressController');
const { authMiddleware, bacOnlyMiddleware } = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, bacOnlyMiddleware, getMyProgress);
router.get('/me/aggregate', authMiddleware, bacOnlyMiddleware, getMyProgressAggregate);
router.post('/upsert', authMiddleware, bacOnlyMiddleware, upsertProgress);
router.post('/mark-completed', authMiddleware, bacOnlyMiddleware, markCompleted);

module.exports = router;
