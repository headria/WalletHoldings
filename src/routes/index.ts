import { Router } from 'express';
import ethereumRoutes from './ethereum.routes';
import solanaRoutes from './solana.routes';
import baseRoutes from './base.routes';
import walletRoutes from './wallet.routes';
import tokenRoutes from './token.routes';
import binanceRoutes from './binance.routes';

const router = Router();

router.use('/ethereum', ethereumRoutes);
router.use('/solana', solanaRoutes);
router.use('/base', baseRoutes);
router.use('/wallets', walletRoutes);
router.use('/binance', binanceRoutes);
router.use('/tokens', tokenRoutes);

module.exports = router; 