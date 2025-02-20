import { Request, Response } from 'express';
import { getAllEthereumTokens as getEthTokens } from '../ethereum';
import { Token } from '../db/models/token';

interface EthToken {
    address: string;
    amount: number;
    usdValue?: number;
    price?: number;
}

// Specific tokens we want to check on Ethereum
const ETH_TOKENS_TO_CHECK = [
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI token example
    // Add more tokens here
];

export const getAllEthereumTokens = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const tokens = await getEthTokens(walletAddress);

        if (tokens.length > 0) {
            const bulkOps = tokens.map(token => ({
                updateOne: {
                    filter: {
                        chain: 'ethereum',
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

        // If no tokens found
        if (!tokens || tokens.length === 0) {
            return res.json({
                success: false,
                data: {
                    found: [],
                    notFound: ETH_TOKENS_TO_CHECK,
                    summary: {
                        totalFound: 0,
                        totalChecked: ETH_TOKENS_TO_CHECK.length,
                        totalUsdValue: "0.00"
                    }
                },
                message: "No tokens found for this wallet"
            });
        }

        // Format response tokens
        const formattedTokens = tokens.map(token => ({
            address: token.contractAddress,
            amount: token.balance,
            usdPrice: typeof token.price === 'number' ? token.price.toFixed(6) : 'Unknown',
            usdValue: typeof token.usdValue === 'number' ? token.usdValue.toFixed(2) : 'Unknown'
        }));

        // Calculate total USD value
        const totalUsdValue = tokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);

        res.json({
            success: true,
            data: {
                found: formattedTokens,
                notFound: ETH_TOKENS_TO_CHECK.filter(addr =>
                    !tokens.some(t => t.contractAddress === addr)
                ),
                summary: {
                    totalFound: tokens.length,
                    totalChecked: ETH_TOKENS_TO_CHECK.length,
                    totalUsdValue: totalUsdValue.toFixed(2)
                }
            }
        });

    } catch (error) {
        console.error('Error in getAllEthereumTokens:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};

// Add a new endpoint to get tokens from database
export const getStoredEthereumTokens = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const storedData = await Token.findOne({ 
            wallet: walletAddress,
            network: 'ethereum' 
        });

        if (!storedData) {
            return res.json({
                success: false,
                message: 'No stored data found for this wallet'
            });
        }

        res.json({
            success: true,
            data: {
                tokens: storedData.tokens,
                totalUsdValue: storedData.totalUsdValue,
                lastUpdated: storedData.lastUpdated
            }
        });

    } catch (error) {
        console.error('Error fetching stored tokens:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 