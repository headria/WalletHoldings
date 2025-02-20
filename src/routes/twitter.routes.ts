import { Router } from 'express';
import { checkRetweet } from '../controllers/twitter.controller';

const router = Router();

router.get('/retweet/:username/:tweetId', checkRetweet);

export default router; 