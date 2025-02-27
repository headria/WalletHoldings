import { Router } from 'express';
import {
    addWalletToWhitelist,
    getChainFromWalletAddress,
    isWalletInWhitelist,
    validatePresaleWalletAddress,
    getAllWhitelistedWallets,
    getAllWhitelistedWalletsWithTokenAmount
} from '../controllers/whitelist.controller';

const router = Router();

/**
 * @swagger
 * /api/whitelist/all:
 *   get:
 *     summary: Get all whitelisted wallets
 *     tags: [Whitelist]
 *     responses:
 *       200:
 *         description: List of all whitelisted wallets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     wallets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           walletAddress:
 *                             type: string
 *                           lastUpdated:
 *                             type: string
 *                             format: date-time
 *                           presaleWallet:
 *                             type: string
 *                     total:
 *                       type: number
 *       500:
 *         description: Server error
 */
router.get('/all', getAllWhitelistedWallets);

router.post('/whitelist', addWalletToWhitelist);
router.get('/chain/:walletAddress', getChainFromWalletAddress);
router.get('/check/:walletAddress', isWalletInWhitelist);
router.get('/validate-presale/:walletAddress', validatePresaleWalletAddress);
router.get('/all-with-token-amount', getAllWhitelistedWalletsWithTokenAmount);

export default router; 