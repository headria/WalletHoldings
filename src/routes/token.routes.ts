import { Router } from 'express';
import TokenController from '../controllers/token.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TokenInfo:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the token
 *           example: "PumpAI"
 *         symbol:
 *           type: string
 *           description: The token symbol
 *           example: "PUMP"
 *         price:
 *           type: number
 *           description: Current price in USD
 *           example: 0.0009742
 *         chainId:
 *           type: string
 *           description: The blockchain network identifier
 *           example: "solana"
 *         address:
 *           type: string
 *           description: The token contract address
 *           example: "7vsKatZ8BAKXXb16ZZMJyg9X3iLn8Zpq4yBPg8mWBLMd"
 *     TokenResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TokenInfo'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "Failed to fetch token information"
 */

/**
 * @swagger
 * tags:
 *   name: Tokens
 *   description: Token price and information endpoints
 */

/**
 * @swagger
 * /api/tokens/all:
 *   get:
 *     summary: Get all tokens information across multiple chains
 *     tags: [Tokens]
 *     description: |
 *       Retrieves token information including prices and metadata from multiple chains (Solana, Ethereum, Base).
 *       Prices are cached for 5 minutes and token metadata for 24 hours.
 *     responses:
 *       200:
 *         description: Successfully retrieved token information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *             example:
 *               success: true
 *               data: [
 *                 {
 *                   name: "PumpAI",
 *                   symbol: "PUMP",
 *                   price: 0.0009742,
 *                   chainId: "solana",
 *                   address: "7vsKatZ8BAKXXb16ZZMJyg9X3iLn8Zpq4yBPg8mWBLMd"
 *                 }
 *               ]
 *       500:
 *         description: Server error while fetching token information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/all', TokenController.getAllTokens);

export default router; 