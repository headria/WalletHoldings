import { Request, Response } from 'express';
import { getAllEthereumTokens as getEthTokens } from '../ethereum';
import { Token } from '../db/models/token';
import axios from 'axios';
import { redisService } from '../services/redis.service';

interface EthToken {
    address: string;
    amount: number;
    usdValue?: number;
    price?: number;
}

interface DexScreenerResponse {
    schemaVersion: string;
    pairs: {
        chainId: string;
        dexId: string;
        pairAddress: string;
        baseToken: {
            address: string;
            name: string;
            symbol: string;
        };
        quoteToken: {
            address: string;
            name: string;
            symbol: string;
        };
        priceNative: string;
        priceUsd: string;
    }[];
}

// Specific tokens we want to check on Ethereum
const ETH_TOKENS_TO_CHECK = [
    "0x5a3e6a77ba2f983ec0d371ea3b475f8bc0811ad5",
    "0x14feE680690900BA0ccCfC76AD70Fd1b95D10e16",
    "0xf94e7d0710709388bce3161c32b4eea56d3f91cc",
    "0x292fcdd1b104de5a00250febba9bc6a5092a0076",
    "0x44971abf0251958492fee97da3e5c5ada88b9185",
    "0x8FAc8031e079F409135766C7d5De29cf22EF897C",
    "0x7da2641000cbb407c329310c461b2cb9c70c3046"
];

async function getTokenPrice(tokenAddress: string): Promise<number | null> {
    try {
        // Check cache first
        const cachedPrice = await redisService.get(`eth:price:${tokenAddress}`);
        if (cachedPrice) {
            return parseFloat(cachedPrice);
        }

        const response = await axios.get<DexScreenerResponse>(
            `https://api.dexscreener.com/latest/dex/search/?q=${tokenAddress}`
        );

        if (response.data.pairs && response.data.pairs.length > 0) {
            // Find the pair where our token is the base token
            const pair = response.data.pairs.find(p =>
                p.baseToken.address.toLowerCase() === tokenAddress.toLowerCase()
            );

            if (pair && pair.priceUsd) {
                const price = Number(pair.priceUsd);
                if (!isNaN(price) && price > 0) {
                    console.log(`Found price for ${tokenAddress}: $${price}`);
                    // Cache the price for 5 minutes
                    await redisService.set(`eth:price:${tokenAddress}`, price.toString(), 300);
                    return price;
                }
            }
        }

        console.log(`No valid price found for token ${tokenAddress}`);
        return null;
    } catch (error) {
        console.error(`Error fetching price for ${tokenAddress}:`, error);
        return null;
    }
}

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

        // Update prices using DexScreener
        await Promise.all(tokens.map(async (token) => {
            const price = await getTokenPrice(token.contractAddress);
            if (price !== null) {
                token.price = price;
                token.usdValue = token.balance * price;
            }
        }));

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
            chain: 'ethereum'
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