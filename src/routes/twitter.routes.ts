import { Router } from 'express';
import { checkRetweet, getWalletVerifications } from '../controllers/twitter.controller';

const router = Router();

router.get('/retweet/:userId/:tweetId/:walletAddress', checkRetweet);
router.get('/verifications/:walletAddress', getWalletVerifications);

export default router; 