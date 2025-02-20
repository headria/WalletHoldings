import { Request, Response } from 'express';
import { hasUserRetweeted } from '../services/twitter.service';

export const checkRetweet = async (req: Request, res: Response) => {
    try {
        const { username, tweetId } = req.params;

        if (!username || !tweetId) {
            return res.status(400).json({
                success: false,
                error: 'Username and tweet ID are required'
            });
        }

        const result = await hasUserRetweeted(username, tweetId);
        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 