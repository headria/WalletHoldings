import { Request, Response } from 'express';
import { hasUserRetweeted } from '../services/twitter.service';
import { RetweetVerification } from '../db/models/retweetVerification';

/**
 * Determine blockchain network from wallet address format
 * @param walletAddress The wallet address to check
 * @returns The determined chain name or null if unrecognized
 */
function determineChainFromAddress(walletAddress: string): string | null {
    // Ethereum and Base addresses (both start with 0x)
    if (/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        // For Base, you might need additional logic to differentiate
        return 'ethereum';
    }
    
    // Solana addresses (base58 encoded, typically 32-44 characters)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        return 'solana';
    }
    
    // BSC addresses (also start with 0x)
    if (/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        // You might need additional logic to differentiate BSC from Ethereum
        return 'bsc';
    }

    return null;
}

export const checkRetweet = async (req: Request, res: Response) => {
    try {
        const { userId, tweetId, walletAddress } = req.params;

        if (!userId || !tweetId || !walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'User ID, tweet ID, and wallet address are required'
            });
        }

        // Determine the chain from wallet address
        const chain = determineChainFromAddress(walletAddress);
        if (!chain) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        // Check if already verified
        const existingVerification = await RetweetVerification.findOne({
            tweetId,
            userId,
            walletAddress,
            chain // Include chain in the query
        });

        if (existingVerification) {
            return res.json({
                success: true,
                data: {
                    hasRetweeted: true,
                    verified: true,
                    verifiedAt: existingVerification.verifiedAt,
                    chain: existingVerification.chain
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
                chain, // Store the determined chain
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
                chain: result.hasRetweeted ? chain : undefined,
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

        // Determine chain from wallet address
        const chain = determineChainFromAddress(walletAddress);
        if (!chain) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const verifications = await RetweetVerification.find({ 
            walletAddress,
            chain // Include chain in the query
        });
        
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