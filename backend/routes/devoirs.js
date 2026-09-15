const express = require('express');
const router = express.Router();
const {
  getAllDevoirs,
  getDevoirById,
  createDevoir,
  updateDevoir,
  deleteDevoir,
  publishDevoir,
  reorderDevoirs,
} = require('../controllers/devoirController');
const { authMiddleware, roleMiddleware, optionalAuthUserMiddleware, bacOnlyMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthUserMiddleware, getAllDevoirs);
router.get('/:id', authMiddleware, bacOnlyMiddleware, getDevoirById);
router.post('/', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), createDevoir);
router.put('/reorder', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), reorderDevoirs);
router.put('/:id/publish', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), publishDevoir);
router.put('/:id', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), updateDevoir);
router.delete('/:id', authMiddleware, bacOnlyMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), deleteDevoir);

module.exports = router;
