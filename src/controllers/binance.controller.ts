import { Request, Response } from 'express';
import { BSC_TOKENS_TO_CHECK, getAllBinanceTokens as getBscTokens } from '../binance';
import { Token } from '../db/models/token';
import axios from 'axios';
import { redisService } from '../services/redis.service';

interface BscToken {
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


interface TokenData {
    contractAddress: string;
    balance: number;
    price?: number;
    usdValue?: number;
}

async function getTokenPrice(tokenAddress: string): Promise<number | null> {
    try {
        // Check cache first
        const cachedPrice = await redisService.get(`bsc:price:${tokenAddress}`);
        if (cachedPrice) {
            return parseFloat(cachedPrice);
        }

        const response = await axios.get<DexScreenerResponse>(
            `https://api.dexscreener.com/latest/dex/search/?q=${tokenAddress}`
        );

        if (response.data.pairs && response.data.pairs.length > 0) {
            // Find the pair where our token is the base token and it's on BSC (chainId: 56)
            const pair = response.data.pairs.find(p =>
                p.baseToken.address.toLowerCase() === tokenAddress.toLowerCase() &&
                p.chainId === '56'  // BSC chainId
            );

            if (pair && pair.priceUsd) {
                const price = Number(pair.priceUsd);
                if (!isNaN(price) && price > 0) {
                    console.log(`Found price for BSC token ${tokenAddress}: $${price}`);
                    // Cache the price for 5 minutes
                    await redisService.set(`bsc:price:${tokenAddress}`, price.toString(), 300);
                    return price;
                }
            }
        }

        console.log(`No valid price found for BSC token ${tokenAddress}`);
        return null;
    } catch (error) {
        console.error(`Error fetching price for BSC token ${tokenAddress}:`, error);
        return null;
    }
}

export const getAllBinanceTokens = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const tokens: TokenData[] = await getBscTokens(walletAddress);

        // Update prices using DexScreener
        await Promise.all(tokens.map(async (token: TokenData) => {
            const price = await getTokenPrice(token.contractAddress);
            console.log(`[BSC] Updating price for token ${price}`, token.balance);
            token.price = price || 0; // Set price to 0 if null
            token.usdValue = token.balance * (price || 0);
        }));

        if (tokens.length > 0) {
            const bulkOps = tokens.map((token: TokenData) => ({
                updateOne: {
                    filter: {
                        chain: 'bsc',
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
            console.log(`[BSC] Stored ${tokens.length} tokens in database`);
        }

        // If no tokens found
        if (!tokens || tokens.length === 0) {
            return res.json({
                success: false,
                data: {
                    found: [],
                    notFound: BSC_TOKENS_TO_CHECK,
                    summary: {
                        totalFound: 0,
                        totalChecked: BSC_TOKENS_TO_CHECK.length,
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
            usdPrice: token.price?.toFixed(6) || '0.00',
            usdValue: token.usdValue?.toFixed(2) || '0.00'
        }));

        // Calculate total USD value
        const totalUsdValue = tokens.reduce((sum: number, token: TokenData) =>
            sum + (token.usdValue || 0), 0);

        // Update the some function with proper type
        const notFound = BSC_TOKENS_TO_CHECK.filter(addr =>
            !tokens.some((t: TokenData) => t.contractAddress === addr)
        );

        res.json({
            success: true,
            data: {
                found: formattedTokens,
                notFound: notFound,
                summary: {
                    totalFound: tokens.length,
                    totalChecked: BSC_TOKENS_TO_CHECK.length,
                    totalUsdValue: totalUsdValue.toFixed(2)
                }
            }
        });

    } catch (error) {
        console.error('Error in getAllBinanceTokens:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};

export const getStoredBinanceTokens = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        // Find all tokens for this wallet on BSC chain
        const storedTokens = await Token.find({
            wallet: walletAddress,
            chain: 'bsc'
        });

        if (!storedTokens || storedTokens.length === 0) {
            return res.json({
                success: false,
                message: 'No stored data found for this wallet'
            });
        }

        // Calculate total USD value
        const totalUsdValue = storedTokens.reduce((sum, token) => sum + (token.value || 0), 0);

        // Format the response
        const formattedTokens = storedTokens.map(token => ({
            address: token.mint,
            amount: token.amount,
            usdPrice: token.price?.toFixed(6) || 'Unknown',
            usdValue: token.value?.toFixed(2) || 'Unknown',
            lastUpdated: token.lastUpdated
        }));

        res.json({
            success: true,
            data: {
                tokens: formattedTokens,
                totalUsdValue: totalUsdValue.toFixed(2),
                lastUpdated: Math.max(...storedTokens.map(t => t.lastUpdated.getTime()))
            }
        });

    } catch (error) {
        console.error('Error fetching stored BSC tokens:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 