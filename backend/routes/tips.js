const express = require('express');
const router = express.Router();
const {
  listPublicTips,
  listAllTips,
  createTip,
  updateTip,
  deleteTip,
  setTipPublish,
} = require('../controllers/studyTipController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.get('/public', listPublicTips);

router.use(authMiddleware, adminMiddleware);
router.get('/all', listAllTips);
router.post('/', createTip);
router.put('/:id', updateTip);
router.delete('/:id', deleteTip);
router.put('/:id/publish', setTipPublish);

module.exports = router;
