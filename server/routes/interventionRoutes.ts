import { Router } from 'express';
import {
  getInterventions,
  createIntervention,
  updateIntervention,
  deleteIntervention,
} from '../controllers/interventionController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);
router.get('/', getInterventions);
router.post('/', createIntervention);
router.put('/:id', updateIntervention);
router.delete('/:id', deleteIntervention);

export default router;
