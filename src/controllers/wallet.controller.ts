import { Request, Response } from 'express';
import { Wallet } from '../db/models/wallet';
import { Token } from '../db/models/token';

export const storeWalletAddress = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        // Find any token with value >= 50 USD for this wallet across all chains
        const significantToken = await Token.findOne({
            wallet: walletAddress,
            value: { $gte: 50 }
        });

        if (!significantToken) {
            return res.status(400).json({
                success: false,
                message: 'Wallet does not meet minimum value requirement'
            });
        }

        const wallet = await Wallet.findOneAndUpdate(
            {
                address: walletAddress
            },
            {
                $set: {
                    lastUpdated: new Date(),
                    qualifyingToken: {
                        mint: significantToken.mint,
                        chain: significantToken.chain,
                        value: significantToken.value
                    }
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
                    qualifyingToken: wallet.qualifyingToken
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

export const getWalletByAddress = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const wallet = await Wallet.findOne({ address: walletAddress });

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found'
            });
        }

        res.json({
            success: true,
            data: {
                wallet: {
                    address: wallet.address,
                    lastUpdated: wallet.lastUpdated,
                    qualifyingToken: wallet.qualifyingToken,
                    verified: wallet.lastUpdated ? true : false
                }
            }
        });

    } catch (error) {
        console.error('Error fetching wallet details:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 