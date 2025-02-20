import { Request, Response } from 'express';
import { getAllBaseTokens as getBaseTokens } from '../base';
import { Token } from '../db/models/token';

interface BaseToken {
    contractAddress: string;
    balance: number;
    price?: number;
    usdValue?: number;
    symbol: string;
}

export const getAllBaseTokens = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const tokens = await getBaseTokens(walletAddress) as BaseToken[];
        console.log('Retrieved tokens:', tokens);

        if (!tokens || tokens.length === 0) {
            return res.json({
                success: false,
                data: {
                    found: [],
                    notFound: [],
                    summary: {
                        totalFound: 0,
                        totalChecked: 0,
                        totalUsdValue: "0.00"
                    }
                },
                message: "No tokens found for this wallet"
            });
        }

        // Store tokens using bulkWrite for better performance
        if (tokens.length > 0) {
            const bulkOps = tokens.map(token => ({
                updateOne: {
                    filter: {
                        chain: 'base',
                        mint: token.contractAddress,
                        wallet: walletAddress
                    },
                    update: {
                        $set: {
                            amount: token.balance,
                            price: token.price || 0,
                            value: token.usdValue || 0,
                            lastUpdated: new Date()
                        }
                    },
                    upsert: true
                }
            }));

            await Token.bulkWrite(bulkOps);
        }

        // Verify storage
        const storedTokens = await Token.find({
            chain: 'base',
            wallet: walletAddress
        });
        console.log('Stored tokens:', storedTokens);

        // Format response
        const formattedTokens = tokens.map(token => ({
            address: token.contractAddress,
            amount: token.balance,
            usdPrice: typeof token.price === 'number' ? token.price.toFixed(6) : 'Unknown',
            usdValue: typeof token.usdValue === 'number' ? token.usdValue.toFixed(2) : 'Unknown'
        }));

        const totalUsdValue = tokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);

        res.json({
            success: true,
            data: {
                found: formattedTokens,
                notFound: [],
                summary: {
                    totalFound: tokens.length,
                    totalChecked: tokens.length,
                    totalUsdValue: totalUsdValue.toFixed(2)
                }
            }
        });

    } catch (error) {
        console.error('Error in getAllBaseTokens:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};

// Add endpoint to get stored tokens
export const getStoredBaseTokens = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const storedTokens = await Token.find({
            chain: 'base',
            wallet: walletAddress
        });

        if (!storedTokens || storedTokens.length === 0) {
            return res.json({
                success: false,
                message: 'No stored tokens found for this wallet'
            });
        }

        const totalValue = storedTokens.reduce((sum, token) => sum + (token.value || 0), 0);

        res.json({
            success: true,
            data: {
                tokens: storedTokens,
                totalValue: totalValue,
                lastUpdated: Math.max(...storedTokens.map(t => t.lastUpdated.getTime()))
            }
        });

    } catch (error) {
        console.error('Error fetching stored Base tokens:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 