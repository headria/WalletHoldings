import { Router } from 'express';
import { getAllBinanceTokens, getStoredBinanceTokens } from '../controllers/binance.controller';

const router = Router();

/**
 * @swagger
 * /api/binance/tokens/{walletAddress}:
 *   get:
 *     tags:
 *       - Binance
 *     summary: Get all BSC tokens for a wallet
 *     description: Fetches current token balances and prices from BSC blockchain
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: BSC wallet address
 *     responses:
 *       200:
 *         description: Successful response
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
 *                           address:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           usdPrice:
 *                             type: string
 *                           usdValue:
 *                             type: string
 *                     notFound:
 *                       type: array
 *                       items:
 *                         type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalFound:
 *                           type: number
 *                         totalChecked:
 *                           type: number
 *                         totalUsdValue:
 *                           type: string
 *       400:
 *         description: Invalid wallet address
 *       500:
 *         description: Server error
 */
router.get('/tokens/:walletAddress', getAllBinanceTokens);

/**
 * @swagger
 * /api/binance/stored-tokens/{walletAddress}:
 *   get:
 *     tags:
 *       - Binance
 *     summary: Get stored BSC tokens for a wallet
 *     description: Retrieves previously stored token data from database
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: BSC wallet address
 *     responses:
 *       200:
 *         description: Successful response
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
 *                     tokens:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           address:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           usdPrice:
 *                             type: string
 *                           usdValue:
 *                             type: string
 *                           lastUpdated:
 *                             type: string
 *                             format: date-time
 *                     totalUsdValue:
 *                       type: string
 *                     lastUpdated:
 *                       type: number
 *       400:
 *         description: Invalid wallet address
 *       500:
 *         description: Server error
 */
router.get('/stored-tokens/:walletAddress', getStoredBinanceTokens);

export default router; 