import { Router } from 'express';
import { getSpecificTokens, getStoredSolanaTokens, getTokenHolders } from '../controllers/solana.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Solana
 *   description: Solana wallet and token endpoints
 */

/**
 * @swagger
 * /api/solana/tokens/{walletAddress}:
 *   get:
 *     summary: Get specific tokens for a Solana wallet
 *     tags: [Solana]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Solana wallet address to check
 *     responses:
 *       200:
 *         description: List of tokens in the wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   mint:
 *                     type: string
 *                     description: Token mint address
 *                   amount:
 *                     type: string
 *                     description: Token amount
 *       400:
 *         description: Invalid wallet address
 *       500:
 *         description: Server error
 */
router.get('/tokens/:walletAddress', getSpecificTokens);

/**
 * @swagger
 * /api/solana/stored/{walletAddress}:
 *   get:
 *     summary: Get stored Solana tokens for a wallet
 *     tags: [Solana]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Solana wallet address to check
 *     responses:
 *       200:
 *         description: List of stored tokens in the wallet
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
 *                     found:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           mint:
 *                             type: string
 *                             description: Token mint address
 *                           amount:
 *                             type: string
 *                             description: Token amount
 *                           usdPrice:
 *                             type: string
 *                             description: Token USD price
 *                           usdValue:
 *                             type: string
 *                             description: Token USD value
 *                           lastUpdated:
 *                             type: string
 *                             format: date-time
 *                             description: Last updated date
 *                     notFound:
 *                       type: array
 *                       items:
 *                         type: string
 *                         description: Mint addresses not found in the wallet
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalFound:
 *                           type: integer
 *                           description: Total found tokens
 *                         totalChecked:
 *                           type: integer
 *                           description: Total checked tokens
 *                         totalUsdValue:
 *                           type: string
 *                           description: Total USD value of found tokens
 *       400:
 *         description: Invalid wallet address
 *       500:
 *         description: Server error
 */
router.get('/stored/:walletAddress', getStoredSolanaTokens);

/**
 * @swagger
 * /api/solana/token-holders/{tokenMint}:
 *   get:
 *     summary: Get token holders for a specific token
 *     tags: [Solana]
 *     parameters:
 *       - in: path
 *         name: tokenMint
 *         required: true
 *         schema:
 *           type: string
 *         description: Token mint address to check
 *     responses:
 *       200:
 *         description: List of token holders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   walletAddress:
 *                     type: string
 *                     description: Solana wallet address
 *                   amount:
 *                     type: string
 *                     description: Token amount
 *       400:
 *         description: Invalid token mint address
 *       500:
 *         description: Server error
 */
router.get('/token-holders/:tokenMint', getTokenHolders);

// Example usage:
// http://localhost:3000/api/solana/tokens/9JcJD8un5QMaDkwuEMzH56gtr3pkvqc3ftWPqwHHU9vR

export default router; 