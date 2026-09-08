const express = require('express');
const router = express.Router();

const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const {
  adminListAllSessions,
  adminToggleGlobal,
  adminCloseSession,
  adminDeleteSession,
} = require('../controllers/liveStudyController');

router.use(authMiddleware, adminMiddleware);

router.get('/sessions', adminListAllSessions);
router.post('/toggle-global', adminToggleGlobal);
router.post('/sessions/:id/close', adminCloseSession);
router.delete('/sessions/:id', adminDeleteSession);

module.exports = router;
