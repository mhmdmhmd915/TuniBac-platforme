const express = require('express');
const router = express.Router();
const {
  getMyProgress,
  upsertProgress,
  markCompleted,
  getMyProgressAggregate,
} = require('../controllers/progressController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/me', authMiddleware, getMyProgress);
router.get('/me/aggregate', authMiddleware, getMyProgressAggregate);
router.post('/upsert', authMiddleware, upsertProgress);
router.post('/mark-completed', authMiddleware, markCompleted);

module.exports = router;
