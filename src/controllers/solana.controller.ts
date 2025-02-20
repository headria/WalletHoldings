import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Token } from '../db/models/token';
import { getWorkingConnection } from '../utils/solana';
import axios from 'axios';

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

async function getTokenPrice(mintAddress: string): Promise<number | null> {
    try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/search/?q=${mintAddress}`);
        if (response.data.pairs && response.data.pairs.length > 0) {
            // Get first pair's USD price
            return Number(response.data.pairs[0].priceUsd);
        }
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

                // Use uiAmount for display
                const amount = Number(tokenAmount.uiAmount);

                return {
                    pubkey: account.pubkey.toString(),
                    mint: parsedInfo.mint,
                    amount,
                    decimals: tokenAmount.decimals,
                    usdValue: 0,
                    price: 0
                };
            })
            .filter((token) =>
                token.amount > 0 && TOKENS_TO_CHECK.includes(token.mint)
            );

        // Fetch prices and calculate USD values
        let totalUsdValue = 0;
        for (const token of tokens) {
            const price = await getTokenPrice(token.mint);
            if (price) {
                token.price = price;
                token.usdValue = token.amount * price;
                totalUsdValue += token.usdValue;
            }
        }

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
                    usdValue: t.usdValue?.toFixed(2) || 'Unknown'
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