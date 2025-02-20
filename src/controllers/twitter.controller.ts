import { Request, Response } from 'express';
import { hasUserRetweeted } from '../services/twitter.service';
import { RetweetVerification } from '../db/models/retweetVerification';

export const checkRetweet = async (req: Request, res: Response) => {
    try {
        const { userId, tweetId, walletAddress } = req.params;

        if (!userId || !tweetId || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'User ID, tweet ID, and wallet address are required'
            });
        }

        // Check if already verified
        const existingVerification = await RetweetVerification.findOne({
            tweetId,
            userId,
            walletAddress
        });

        if (existingVerification) {
            return res.json({
                success: true,
                data: {
                    hasRetweeted: true,
                    verified: true,
                    verifiedAt: existingVerification.verifiedAt
                }
            });
        }

        // Check retweet status
        const result = await hasUserRetweeted(userId, tweetId);
        
        if (result.hasRetweeted) {
            // Store verification in database
            const verification = new RetweetVerification({
                tweetId,
                userId,
                walletAddress,
                verified: true,
                verifiedAt: new Date()
            });
            await verification.save();
        }

        res.json({
            success: true,
            data: {
                ...result,
                walletAddress: result.hasRetweeted ? walletAddress : undefined,
                verified: result.hasRetweeted
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};

// Add endpoint to get all verified retweets for a wallet
export const getWalletVerifications = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        const verifications = await RetweetVerification.find({ walletAddress });
        
        res.json({
            success: true,
            data: verifications
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 