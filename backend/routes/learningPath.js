const express = require('express');
const router = express.Router();

const { authMiddleware, bacOnlyMiddleware } = require('../middleware/authMiddleware');
const { getLearningPath } = require('../controllers/learningPathController');

router.get('/', authMiddleware, bacOnlyMiddleware, getLearningPath);

module.exports = router;
