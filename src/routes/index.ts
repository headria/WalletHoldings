import { Router } from 'express';
import ethereumRoutes from './ethereum.routes';
import solanaRoutes from './solana.routes';
import baseRoutes from './base.routes';
import walletRoutes from './wallet.routes';

const router = Router();

router.use('/ethereum', ethereumRoutes);
router.use('/solana', solanaRoutes);
router.use('/base', baseRoutes);
router.use('/wallets', walletRoutes);

module.exports = router; 