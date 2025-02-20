import { Router } from 'express';
import { getSpecificTokens } from '../controllers/solana.controller';

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

// Example usage:
// http://localhost:3000/api/solana/tokens/9JcJD8un5QMaDkwuEMzH56gtr3pkvqc3ftWPqwHHU9vR

export default router; 