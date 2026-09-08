const express = require('express');
const router = express.Router();
const {
  getPublicProducts,
  getProductDetail,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
} = require('../controllers/shopController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Public
router.get('/', getPublicProducts);
router.get('/:id', getProductDetail);

// Admin only
router.use(authMiddleware, adminMiddleware);
router.get('/all', getAllProducts);
router.post('/', createProduct);
router.put('/reorder', reorderProducts);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
