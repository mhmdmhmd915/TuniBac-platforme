const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const { getLearningPath } = require('../controllers/learningPathController');

router.get('/', authMiddleware, getLearningPath);

module.exports = router;
