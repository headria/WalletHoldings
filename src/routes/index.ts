import { Router } from 'express';
import ethereumRoutes from './ethereum.routes';
import solanaRoutes from './solana.routes';
import baseRoutes from './base.routes';

const router = Router();

router.use('/ethereum', ethereumRoutes);
router.use('/solana', solanaRoutes);
router.use('/base', baseRoutes);

module.exports = router; 