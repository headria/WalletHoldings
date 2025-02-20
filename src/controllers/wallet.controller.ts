import { Request, Response } from 'express';
import { Wallet } from '../db/models/wallet';

export const storeWalletAddress = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        // Try to find existing wallet or create new one
        const wallet = await Wallet.findOneAndUpdate(
            { 
                address: walletAddress
            },
            {
                $set: {
                    lastUpdated: new Date()
                }
            },
            {
                new: true,
                upsert: true
            }
        );

        res.json({
            success: true,
            data: {
                wallet: {
                    address: wallet.address,
                    lastUpdated: wallet.lastUpdated,
                    totalValue: wallet.totalValue
                }
            }
        });

    } catch (error) {
        console.error('Error storing wallet address:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};

export const getStoredWallets = async (req: Request, res: Response) => {
    try {
        const wallets = await Wallet.find().sort({ lastUpdated: -1 });

        res.json({
            success: true,
            data: {
                wallets: wallets.map(wallet => ({
                    address: wallet.address,
                    lastUpdated: wallet.lastUpdated,
                    totalValue: wallet.totalValue
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching stored wallets:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 