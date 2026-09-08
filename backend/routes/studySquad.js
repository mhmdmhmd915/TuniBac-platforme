const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');

const {
  listMySquads,
  listMyInvitations,
  createSquad,
  getSquadDetail,
  inviteByPhone,
  cancelInvitation,
  acceptInvitation,
  declineInvitation,
  joinByCode,
  removeMember,
  leaveSquad,
  renameSquad,
  disbandSquad,
  upsertGoal,
  listChat,
  sendChatMessage,
} = require('../controllers/studySquadController');

router.use(authMiddleware);

router.get('/mine', listMySquads);
router.get('/invitations', listMyInvitations);
router.post('/join-by-code', joinByCode);
router.post('/', createSquad);
router.get('/:id', getSquadDetail);
router.patch('/:id/rename', renameSquad);
router.post('/:id/disband', disbandSquad);
router.post('/:id/leave', leaveSquad);
router.post('/:id/invite', inviteByPhone);
router.delete('/:id/invitations/:invitationId', cancelInvitation);
router.post('/:id/members/:userId/remove', removeMember);
router.post('/:id/goal', upsertGoal);
router.get('/:id/chat', listChat);
router.post('/:id/chat', sendChatMessage);

router.post('/invitations/:invitationId/accept', acceptInvitation);
router.post('/invitations/:invitationId/decline', declineInvitation);

module.exports = router;
