const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getStudentCommunications } = require('../controllers/communicationController');

const router = express.Router();

router.get('/', authMiddleware, getStudentCommunications);

module.exports = router;
