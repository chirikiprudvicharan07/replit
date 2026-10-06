import { Router } from 'express';
import {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
} from '../controllers/studentController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);
router.get('/', getStudents);
router.post('/', createStudent);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;
