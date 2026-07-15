const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getStudentPlannerTasks,
  createStudentPlannerTask,
  updateStudentPlannerTask,
  toggleStudentPlannerTaskComplete,
  deleteStudentPlannerTask,
} = require('../controllers/studentPlannerController');

router.use(authMiddleware);

router.get('/', getStudentPlannerTasks);
router.post('/', createStudentPlannerTask);
router.put('/:id', updateStudentPlannerTask);
router.patch('/:id/complete', toggleStudentPlannerTaskComplete);
router.delete('/:id', deleteStudentPlannerTask);

module.exports = router;
