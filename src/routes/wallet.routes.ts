import { Router } from 'express';
import { 
    storeWalletAddress,
    getStoredWallets,
    getWalletByAddress
} from '../controllers/wallet.controller';

const router = Router();

router.post('/:walletAddress', storeWalletAddress);
router.get('/wallets', getStoredWallets);
router.get('/wallet/:walletAddress', getWalletByAddress);

/**
 * @swagger
 * tags:
 *   name: Wallets
 *   description: Wallet storage and management endpoints
 */

/**
 * @swagger
 * /api/wallets/{walletAddress}:
 *   post:
 *     summary: Store a wallet address
 *     tags: [Wallet]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address to store
 *     responses:
 *       200:
 *         description: Wallet address stored successfully
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
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                         qualifyingToken:
 *                           type: object
 *                           properties:
 *                             mint:
 *                               type: string
 *                             chain:
 *                               type: string
 *                             value:
 *                               type: number
 *       400:
 *         description: Invalid wallet address
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/wallets/wallets:
 *   get:
 *     summary: Get all stored wallet addresses
 *     tags: [Wallet]
 *     responses:
 *       200:
 *         description: List of stored wallet addresses
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
 *                           address:
 *                             type: string
 *                           lastUpdated:
 *                             type: string
 *                             format: date-time
 *                           totalValue:
 *                             type: number
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/wallets/wallet/{walletAddress}:
 *   get:
 *     summary: Get wallet details by address
 *     tags: [Wallet]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address to fetch
 *     responses:
 *       200:
 *         description: Wallet details retrieved successfully
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
 *                     wallet:
 *                       type: object
 *                       properties:
 *                         address:
 *                           type: string
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                         qualifyingToken:
 *                           type: object
 *                           properties:
 *                             mint:
 *                               type: string
 *                             chain:
 *                               type: string
 *                             value:
 *                               type: number
 *                         verified:
 *                           type: boolean
 *       400:
 *         description: Wallet address is required
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */

export default router; 