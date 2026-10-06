import { Router } from 'express';
import {
  getOverview,
  getAttendanceStats,
  getPerformanceStats,
  getRiskDistribution,
} from '../controllers/dashboardController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);
router.get('/overview', getOverview);
router.get('/attendance', getAttendanceStats);
router.get('/performance', getPerformanceStats);
router.get('/risk', getRiskDistribution);

export default router;
