import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Token } from '../db/models/token';
import { getWorkingConnection } from '../utils/solana';
import axios from 'axios';

// Cache for token prices
const priceCache = new Map<string, { price: number, timestamp: number }>();
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Specific tokens we want to check
const TOKENS_TO_CHECK = [
    'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC',
    '61V8vBaqAGMpgDQi4JcAwo1dmBGHsyhzodcPqnEVpump',
    'KENJSUYLASHUMfHyy5o4Hp2FdNqZg1AsUPhfH2kYvEP',
    '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
    'Hax9LTgsQkze1YFychnBLtFH8gYbQKtKfWKKg2SP6gdD',
    '74SBV4zDXxTRgv1pEMoECskKBkZHc2yGPnc7GYVepump'
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

async function getTokenPriceWithCache(mintAddress: string): Promise<number | null> {
    const cached = priceCache.get(mintAddress);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_DURATION) {
        return cached.price;
    }
    
    try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/search/?q=${mintAddress}`);
        if (response.data.pairs && response.data.pairs.length > 0) {
            const price = Number(response.data.pairs[0].priceUsd);
            priceCache.set(mintAddress, { price, timestamp: Date.now() });
            return price;
        }
    } catch (error) {
        console.error(`Error fetching price for ${mintAddress}:`, error);
    }
    return null;
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