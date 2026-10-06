import { Router } from 'express';
import {
  getAttendance,
  recordAttendance,
  updateAttendance,
  deleteAttendance,
} from '../controllers/attendanceController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);
router.get('/', getAttendance);
router.post('/', recordAttendance);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
