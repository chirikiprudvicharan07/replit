import { Router } from 'express';
import {
  getSubmissions,
  recordSubmission,
  updateSubmission,
  deleteSubmission,
} from '../controllers/submissionController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);
router.get('/', getSubmissions);
router.post('/', recordSubmission);
router.put('/:id', updateSubmission);
router.delete('/:id', deleteSubmission);

export default router;
