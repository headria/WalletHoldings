import { Router } from 'express';
import { checkRetweet, getWalletVerifications } from '../controllers/twitter.controller';

const router = Router();

router.get('/retweet/:userId/:tweetId/:walletAddress', checkRetweet);
router.get('/verifications/:walletAddress', getWalletVerifications);

/**
 * @swagger
 * /api/twitter/retweet/{userId}/{tweetId}/{walletAddress}:
 *   get:
 *     summary: Check if a user has retweeted a specific tweet
 *     tags: [Twitter]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Twitter user ID
 *       - in: path
 *         name: tweetId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the tweet to check
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: User's wallet address
 *     responses:
 *       200:
 *         description: Retweet verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasRetweeted:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * tags:
 *   name: Twitter
 *   description: Twitter verification endpoints
 */

/**
 * @swagger
 * /api/twitter/verifications/{walletAddress}:
 *   get:
 *     summary: Get all Twitter verifications for a wallet address
 *     tags: [Twitter]
 *     parameters:
 *       - in: path
 *         name: walletAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address to check verifications for
 *     responses:
 *       200:
 *         description: List of Twitter verifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   walletAddress:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   tweetId:
 *                     type: string
 *                   verified:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: No verifications found
 *       500:
 *         description: Server error
 */

export default router; 