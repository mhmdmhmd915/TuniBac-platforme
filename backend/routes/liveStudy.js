const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const {
  createSession,
  listMySectionSessions,
  getSessionById,
  joinSession,
  leaveSession,
  finishSession,
  updateMediaState,
  sendChatMessage,
  ingestHeartbeat,
  ingestHeartbeatForSession,
  getRanking,
  listBadges,
  listSessionParticipants,
  listSessionChatHistory,
  getStudentStatus,
} = require('../controllers/liveStudyController');

router.use(authMiddleware);

router.post('/sessions', createSession);
router.get('/sessions', listMySectionSessions);
router.get('/status', getStudentStatus);
router.get('/sessions/:id', getSessionById);
router.post('/sessions/:id/join', joinSession);
router.post('/sessions/:id/leave', leaveSession);
router.post('/sessions/:id/finish', finishSession);
router.put('/sessions/:id/media', updateMediaState);
router.post('/sessions/:id/chat', sendChatMessage);
router.get('/sessions/:id/participants', listSessionParticipants);
router.get('/sessions/:id/chat', listSessionChatHistory);
router.post('/sessions/:id/heartbeat', ingestHeartbeatForSession);
router.post('/heartbeat', ingestHeartbeat);
router.get('/ranking', getRanking);
router.get('/badges', listBadges);

module.exports = router;
