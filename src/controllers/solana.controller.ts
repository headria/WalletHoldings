import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Token } from '../db/models/token';
import { getWorkingConnection } from '../utils/solana';
import { redisService } from '../services/redis.service';
import axios from 'axios';

const PRICE_CACHE_DURATION = 300; // 5 minutes in seconds

// Specific tokens we want to check
const TOKENS_TO_CHECK = [
    'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC',
    '61V8vBaqAGMpgDQi4JcAwo1dmBGHsyhzodcPqnEVpump',
    'KENJSUYLASHUMfHyy5o4Hp2FdNqZg1AsUPhfH2kYvEP',
    '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
    'Hax9LTgsQkze1YFychnBLtFH8gYbQKtKfWKKg2SP6gdD',
    '74SBV4zDXxTRgv1pEMoECskKBkZHc2yGPnc7GYVepump',
    'Goatm5cqggssKRUwbMnPhHXKtN5SDGEP57qjwTSHD1Xf',
    'AKzAhPPLMH5NG35kGbgkwtrTLeGyVrfCtApjnvqAATcm',
    '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9'
];

// Add interface for token type
interface TokenData {
    pubkey: string;
    mint: string;
    amount: number;
    decimals: number;
    usdValue?: number;
    price?: number;
}

interface DexScreenerResponse {
    schemaVersion: string;
    pairs: {
        chainId: string;
        baseToken: {
            address: string;
            symbol: string;
        };
        priceUsd: string;
    }[];
}

async function getTokenPriceWithCache(mintAddress: string): Promise<number | null> {
    try {
        // Check Redis cache first
        const cacheKey = `token:price:solana:${mintAddress}`;
        const cachedPrice = await redisService.get(cacheKey);

        if (cachedPrice) {
            return Number(cachedPrice);
        }

        // If not in cache, fetch from API
        const response = await axios.get<DexScreenerResponse>(
            `https://api.dexscreener.com/latest/dex/search/?q=${mintAddress}`
        );

        if (response.data.pairs && response.data.pairs.length > 0) {
            // Find the pair that matches our token address
            const pair = response.data.pairs.find(p =>
                p.baseToken.address.toLowerCase() === mintAddress.toLowerCase()
            );

            if (pair && pair.priceUsd) {
                const price = Number(pair.priceUsd);
                if (!isNaN(price) && price > 0) {
                    // Cache the price
                    await redisService.set(cacheKey, price.toString(), PRICE_CACHE_DURATION);
                    console.log(`Cached price for ${mintAddress}: $${price}`);
                    return price;
                }
            }
        }

        console.log(`No valid price found for token ${mintAddress}`);
        return null;
    } catch (error) {
        console.error(`Error fetching price for ${mintAddress}:`, error);
        return null;
    }
}

export const getSpecificTokens = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        const solanaConnection = await getWorkingConnection();
        const wallet = new PublicKey(walletAddress);

        const response = await solanaConnection.getParsedTokenAccountsByOwner(
            wallet,
            { programId: TOKEN_PROGRAM_ID },
            'confirmed'
        );

        const tokens: TokenData[] = response.value
            .map((account) => {
                const parsedInfo = account.account.data.parsed.info;
                const tokenAmount = parsedInfo.tokenAmount;
                return {
                    pubkey: account.pubkey.toString(),
                    mint: parsedInfo.mint,
                    amount: Number(tokenAmount.uiAmount),
                    decimals: tokenAmount.decimals,
                    usdValue: 0,
                    price: 0
                };
            })
            .filter((token) =>
                token.amount > 0 && TOKENS_TO_CHECK.includes(token.mint)
            );

        // Fetch prices using cache
        let totalUsdValue = 0;
        await Promise.all(tokens.map(async (token) => {
            const price = await getTokenPriceWithCache(token.mint);
            if (price) {
                token.price = price;
                token.usdValue = token.amount * price;
                totalUsdValue += token.usdValue;
            }
        }));

        // Save to database
        if (tokens.length > 0) {
            const bulkOps = tokens.map(token => ({
                updateOne: {
                    filter: {
                        chain: 'solana',
                        mint: token.mint,
                        wallet: walletAddress
                    },
                    update: {
                        $set: {
                            amount: token.amount,
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

        res.json({
            success: true,
            data: {
                found: tokens.map(t => ({
                    mint: t.mint,
                    usdPrice: t.price?.toFixed(6) || 'Unknown',
                    usdValue: (t.amount * (t.price || 0)).toFixed(2) || 'Unknown',
                    tokenAmount: t.amount.toFixed(2)
                })),
                notFound: TOKENS_TO_CHECK.filter(mint =>
                    !tokens.some(t => t.mint === mint)
                ),
                summary: {
                    totalFound: tokens.length,
                    totalChecked: TOKENS_TO_CHECK.length,
                    totalUsdValue: totalUsdValue.toFixed(2)
                }
            }
        });

    } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getStoredSolanaTokens = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        // Find all tokens for this wallet on solana chain
        const storedTokens = await Token.find({
            wallet: walletAddress,
            chain: 'solana'
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
            mint: token.mint,
            amount: token.amount,
            usdPrice: token.price?.toFixed(6) || 'Unknown',
            usdValue: token.value?.toFixed(2) || 'Unknown',
            lastUpdated: token.lastUpdated
        }));

        res.json({
            success: true,
            data: {
                found: formattedTokens,
                notFound: TOKENS_TO_CHECK.filter(mint =>
                    !storedTokens.some(t => t.mint === mint)
                ),
                summary: {
                    totalFound: storedTokens.length,
                    totalChecked: TOKENS_TO_CHECK.length,
                    totalUsdValue: totalUsdValue.toFixed(2)
                }
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