const express = require('express');
const router = express.Router();
const { submitContact, getAllMessages } = require('../controllers/contactController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.post('/', submitContact);
router.get('/', authMiddleware, adminMiddleware, getAllMessages);

module.exports = router;
