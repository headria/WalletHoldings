import { Router } from 'express';
import { 
    storeWalletAddress,
    getStoredWallets
} from '../controllers/wallet.controller';

const router = Router();

router.post('/:walletAddress', storeWalletAddress);
router.get('/', getStoredWallets);

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet storage and management endpoints
 */

/**
 * @swagger
 * /api/wallet/{walletAddress}:
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
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid wallet address
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Get all stored wallet addresses
 *     tags: [Wallet]
 *     responses:
 *       200:
 *         description: List of stored wallet addresses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */

export default router; 