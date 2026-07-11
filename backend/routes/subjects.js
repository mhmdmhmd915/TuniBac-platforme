const express = require('express');
const router = express.Router();
const { 
  getAllSubjects, 
  getSubjectById, 
  createSubject, 
  updateSubject, 
  deleteSubject 
} = require('../controllers/subjectController');
const { authMiddleware, adminMiddleware, optionalAuthUserMiddleware } = require('../middleware/authMiddleware');

router.get('/', optionalAuthUserMiddleware, getAllSubjects);
router.get('/:id', optionalAuthUserMiddleware, getSubjectById);
router.post('/', authMiddleware, adminMiddleware, createSubject);
router.put('/:id', authMiddleware, adminMiddleware, updateSubject);
router.delete('/:id', authMiddleware, adminMiddleware, deleteSubject);

module.exports = router;
