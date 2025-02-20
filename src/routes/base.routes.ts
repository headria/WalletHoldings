import { Router } from 'express';
import { 
    getAllBaseTokens, 
    getStoredBaseTokens 
} from '../controllers/base.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Base
 *   description: Base chain wallet and token endpoints
 */

/**
 * @swagger
 * /api/base/tokens/{walletAddress}:
 *   get:
 *     summary: Get all tokens for a Base wallet
 *     tags: [Base]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Base wallet address to check
 *     responses:
 *       200:
 *         description: List of all tokens in the wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   contractAddress:
 *                     type: string
 *                     description: Token contract address
 *                   balance:
 *                     type: string
 *                     description: Token balance
 *                   symbol:
 *                     type: string
 *                     description: Token symbol
 *       400:
 *         description: Invalid wallet address
 *       500:
 *         description: Server error
 */
router.get('/tokens/:walletAddress', getAllBaseTokens);

/**
 * @swagger
 * /api/base/stored-tokens/{walletAddress}:
 *   get:
 *     summary: Get stored tokens for a Base wallet
 *     tags: [Base]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Base wallet address to check
 *     responses:
 *       200:
 *         description: List of stored tokens in the wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   contractAddress:
 *                     type: string
 *                     description: Token contract address
 *                   balance:
 *                     type: string
 *                     description: Token balance
 *                   symbol:
 *                     type: string
 *                     description: Token symbol
 *                   lastUpdated:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Invalid wallet address
 *       500:
 *         description: Server error
 */
router.get('/stored-tokens/:walletAddress', getStoredBaseTokens);

export default router; 