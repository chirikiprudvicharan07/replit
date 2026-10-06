import { Router } from 'express';
import {
  analyzeStudent,
  getAnalyses,
  getAnalysisById,
} from '../controllers/aiController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);
router.post('/analyze-student/:studentId', analyzeStudent);
router.get('/analyses', getAnalyses);
router.get('/analyses/:id', getAnalysisById);

export default router;
