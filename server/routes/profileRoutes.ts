import { Router } from 'express';
import { getMe, updateProfile } from '../controllers/authController.ts';
import { authenticateToken } from '../middleware/auth.ts';

const router = Router();

router.use(authenticateToken);
router.get('/', getMe);
router.put('/', updateProfile);

export default router;
