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
const { authMiddleware, roleMiddleware, optionalAuthUserMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthUserMiddleware, getAllDevoirs);
router.get('/:id', authMiddleware, getDevoirById);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), createDevoir);
router.put('/reorder', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), reorderDevoirs);
router.put('/:id/publish', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), publishDevoir);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), updateDevoir);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'TEACHER']), deleteDevoir);

module.exports = router;
