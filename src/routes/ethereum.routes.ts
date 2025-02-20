import { Router } from 'express';
import { 
    getAllEthereumTokens, 
    getStoredEthereumTokens 
} from '../controllers/ethereum.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Ethereum
 *   description: Ethereum wallet and token endpoints
 */

/**
 * @swagger
 * /api/ethereum/tokens/{walletAddress}:
 *   get:
 *     summary: Get all tokens for an Ethereum wallet
 *     tags: [Ethereum]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Ethereum wallet address to check
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
router.get('/tokens/:walletAddress', getAllEthereumTokens);

/**
 * @swagger
 * /api/ethereum/stored-tokens/{walletAddress}:
 *   get:
 *     summary: Get stored tokens for an Ethereum wallet
 *     tags: [Ethereum]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Ethereum wallet address to check
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
router.get('/stored-tokens/:walletAddress', getStoredEthereumTokens);

export default router; 