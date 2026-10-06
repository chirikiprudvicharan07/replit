import { Router } from 'express';
import {
  getMarks,
  createMark,
  updateMark,
  deleteMark,
} from '../controllers/markController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);
router.get('/', getMarks);
router.post('/', createMark);
router.put('/:id', updateMark);
router.delete('/:id', deleteMark);

export default router;
