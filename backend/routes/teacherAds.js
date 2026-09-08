const express = require('express');
const router = express.Router();
const {
  getPublicAds,
  getAllAds,
  createAd,
  updateAd,
  deleteAd,
  reorderAds,
} = require('../controllers/teacherAdController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Public (landing, student pages)
router.get('/', getPublicAds);

// Admin only
router.use(authMiddleware, adminMiddleware);
router.get('/all', getAllAds);
router.post('/', createAd);
router.put('/reorder', reorderAds);
router.put('/:id', updateAd);
router.delete('/:id', deleteAd);

module.exports = router;
