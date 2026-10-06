import { Router } from 'express';
import {
  getClasses,
  createClass,
  getClassById,
  updateClass,
  deleteClass,
} from '../controllers/classController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);
router.get('/', getClasses);
router.post('/', createClass);
router.get('/:id', getClassById);
router.put('/:id', updateClass);
router.delete('/:id', deleteClass);

export default router;
