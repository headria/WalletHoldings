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
    name?: string;
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

interface TokenInfo {
    contractAddress: string;
    balance: number;
    price?: number;
    usdValue?: number;
    name?: string;
}

// Specific tokens we want to check on Ethereum
const ETH_TOKENS_TO_CHECK = [
    "0x5a3e6a77ba2f983ec0d371ea3b475f8bc0811ad5",
    "0x14feE680690900BA0ccCfC76AD70Fd1b95D10e16",
    "0xf94e7d0710709388bce3161c32b4eea56d3f91cc",
    "0x292fcdd1b104de5a00250febba9bc6a5092a0076",
    "0x44971abf0251958492fee97da3e5c5ada88b9185",
    "0x8FAc8031e079F409135766C7d5De29cf22EF897C",
    '0xadf7c35560035944e805d98ff17d58cde2449389',
    "0x7da2641000cbb407c329310c461b2cb9c70c3046",
    '0xEbcD1Cc56Db8ce89B4A83C037103c870998034C7',
];

// Add this constant at the top with other constants
const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee".toLowerCase();

async function getTokenPrice(tokenAddress: string): Promise<{ price: number | null, name?: string }> {
    try {
        // Check cache first
        const cacheKey = `eth:price:${tokenAddress}`;
        const nameKey = `eth:name:${tokenAddress}`;
        const cachedPrice = await redisService.get(cacheKey);
        const cachedName = await redisService.get(nameKey);

        if (cachedPrice && cachedName) {
            return { price: parseFloat(cachedPrice), name: cachedName };
        }

        const response = await axios.get<DexScreenerResponse>(
            `https://api.dexscreener.com/latest/dex/search/?q=${tokenAddress}`
        );

        if (response.data.pairs && response.data.pairs.length > 0) {
            const pair = response.data.pairs.find(p =>
                p.baseToken.address.toLowerCase() === tokenAddress.toLowerCase()
            );

            if (pair && pair.priceUsd) {
                const price = Number(pair.priceUsd);
                const name = pair.baseToken.name;
                if (!isNaN(price) && price > 0) {
                    console.log(`Found price for ${tokenAddress}: $${price}`);
                    // Cache both price and name
                    await redisService.set(cacheKey, price.toString(), 300);
                    await redisService.set(nameKey, name, 300);
                    return { price, name };
                }
            }
        }

        console.log(`No valid price found for token ${tokenAddress}`);
        return { price: null };
    } catch (error) {
        console.error(`Error fetching price for ${tokenAddress}:`, error);
        return { price: null };
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

        // Filter out ETH before processing
        const erc20Tokens = tokens.filter(token => 
            token.contractAddress && 
            token.contractAddress.toLowerCase() !== ETH_ADDRESS
        );

        // Update prices using DexScreener
        await Promise.all(erc20Tokens.map(async (token) => {
            const { price, name } = await getTokenPrice(token.contractAddress);
            if (price !== null) {
                token.price = price;
                token.name = name;
                token.usdValue = token.balance * price;
            }
        }));

        if (erc20Tokens.length > 0) {
            const bulkOps = erc20Tokens.map(token => ({
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
        if (!erc20Tokens || erc20Tokens.length === 0) {
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
        const formattedTokens = erc20Tokens.map(token => ({
            address: token.contractAddress,
            name: token.name || 'Unknown',
            chain: 'ethereum',
            amount: token.balance,
            usdPrice: typeof token.price === 'number' ? token.price.toFixed(6) : 'Unknown',
            usdValue: typeof token.usdValue === 'number' ? token.usdValue.toFixed(2) : 'Unknown'
        }));

        // Calculate total USD value
        const totalUsdValue = erc20Tokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);

        res.json({
            success: true,
            data: {
                found: formattedTokens,
                notFound: ETH_TOKENS_TO_CHECK.filter(addr =>
                    !erc20Tokens.some(t => t.contractAddress === addr)
                ),
                summary: {
                    totalFound: erc20Tokens.length,
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

        // Find all tokens for this wallet on ethereum chain
        const storedTokens = await Token.find({
            wallet: walletAddress,
            chain: 'ethereum'
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
            name: token.name || 'Unknown',
            chain: 'ethereum',
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
        console.error('Error fetching stored tokens:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 