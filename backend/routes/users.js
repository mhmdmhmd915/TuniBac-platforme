const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getStats } = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.get('/stats', authMiddleware, getStats);

module.exports = router;
