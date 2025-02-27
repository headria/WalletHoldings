import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Token } from '../db/models/token';
import { getWorkingConnection } from '../utils/solana';
import { redisService } from '../services/redis.service';
import axios from 'axios';
import { getTokenHoldersByMint } from '../services/whitelist.service';

const PRICE_CACHE_DURATION = 300; // 5 minutes in seconds

// Specific tokens we want to check
const TOKENS_TO_CHECK = [
    '8sn9549p3zn6xpqrqpapn57xzkch6sjxlwuejcg2w4ji',
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
    name?: string;
}

interface DexScreenerResponse {
    schemaVersion: string;
    pairs: {
        chainId: string;
        baseToken: {
            address: string;
            symbol: string;
            name: string;
        };
        priceUsd: string;
    }[];
}

async function getTokenPriceWithCache(mintAddress: string): Promise<{ price: number | null, name?: string }> {
    try {
        // Check Redis cache first
        const cacheKey = `token:price:solana:${mintAddress}`;
        const nameKey = `token:name:solana:${mintAddress}`;
        const cachedPrice = await redisService.get(cacheKey);
        const cachedName = await redisService.get(nameKey);

        if (cachedPrice && cachedName) {
            return { price: Number(cachedPrice), name: cachedName };
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
                const name = pair.baseToken.name;
                if (!isNaN(price) && price > 0) {
                    // Cache the price
                    await redisService.set(cacheKey, price.toString(), PRICE_CACHE_DURATION);
                    await redisService.set(nameKey, name, PRICE_CACHE_DURATION);
                    console.log(`Cached price and name for ${mintAddress}: $${price}, ${name}`);
                    return { price, name };
                }
            }
        }

        console.log(`No valid price found for token ${mintAddress}`);
        return { price: null };
    } catch (error) {
        console.error(`Error fetching price for ${mintAddress}:`, error);
        return { price: null };
    }
}

export const getSpecificTokens = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            console.log('No wallet address provided');
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        console.log(`Fetching tokens for wallet: ${walletAddress}`);
        const solanaConnection = await getWorkingConnection();
        const wallet = new PublicKey(walletAddress);

        const response = await solanaConnection.getParsedTokenAccountsByOwner(
            wallet,
            { programId: TOKEN_PROGRAM_ID },
            'confirmed'
        );

        // Log the entire response for debugging
        console.log('Parsed token accounts response:', JSON.stringify(response, null, 2));

        let tokens: TokenData[] = response.value
            .map((account) => {
                const parsedInfo = account.account.data.parsed.info;
                const tokenAmount = parsedInfo.tokenAmount;
                console.log(`Token found: ${parsedInfo.mint}, Amount: ${tokenAmount.uiAmount}`); // Log each token found
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
                TOKENS_TO_CHECK.includes(token.mint) // Remove amount > 0 condition for logging
            );

        console.log(`Tokens after filtering: ${JSON.stringify(tokens, null, 2)}`);

        // Check if the specific token is missing and attempt to fetch it directly
        if (!tokens.some(token => token.mint === 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC')) {
            console.log('Specific token not found, attempting direct fetch...');
            try {
                const specificTokenResponse = await solanaConnection.getParsedTokenAccountsByOwner(
                    wallet,
                    { mint: new PublicKey('HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC') },
                    'confirmed'
                );

                if (specificTokenResponse.value.length > 0) {
                    const account = specificTokenResponse.value[0];
                    const parsedInfo = account.account.data.parsed.info;
                    const tokenAmount = parsedInfo.tokenAmount;
                    console.log(`Direct fetch found token: ${parsedInfo.mint}, Amount: ${tokenAmount.uiAmount}`);
                    tokens.push({
                        pubkey: account.pubkey.toString(),
                        mint: parsedInfo.mint,
                        amount: Number(tokenAmount.uiAmount),
                        decimals: tokenAmount.decimals,
                        usdValue: 0,
                        price: 0
                    });
                } else {
                    console.log('Direct fetch did not find the token.');
                }
            } catch (error) {
                console.error('Error during direct fetch:', error);
            }
        }

        // Fetch prices using cache
        let totalUsdValue = 0;
        await Promise.all(tokens.map(async (token) => {
            console.log(`Checking token: ${token.mint}, Amount: ${token.amount}`); // Log token being checked
            const { price, name } = await getTokenPriceWithCache(token.mint);
            if (price) {
                token.price = price;
                token.name = name;
                token.usdValue = token.amount * price;
                totalUsdValue += token.usdValue;
                console.log(`Token ${token.mint} has price: $${price}, USD Value: $${token.usdValue}`); // Log result
            } else {
                console.log(`Price not found for token: ${token.mint}`); // Log if price not found
            }
        }));

        // Save to database
        try {
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
                                name: token.name || 'Unknown',
                                lastUpdated: new Date()
                            }
                        },
                        upsert: true
                    }
                }));

                await Token.bulkWrite(bulkOps).catch(error => {
                    console.error('Database bulk write error:', error);
                    throw new Error('Failed to store token data');
                });
            }
        } catch (error) {
            console.error('Error during database operation:', error);
        }

        res.json({
            success: true,
            data: {
                found: tokens.map(t => ({
                    mint: t.mint,
                    name: t.name || 'Unknown',
                    chain: 'solana',
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
            name: token.name || 'Unknown',
            chain: 'solana',
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

// Import the predefined wallet addresses
const walletAddresses = [
    "9JcJD8un5QMaDkwuEMzH56gtr3pkvqc3ftWPqwHHU9vR",
    "FvyKbbNQuD6iH1ZM23gFX3D18DoHxR9CMUonNcY8v5ur",
    '8MiwoWeCGhxPgjBqEPif2GTxBK6UeFiX6QypeULnYqA7',
    'F2isFFcGE57dvdWkdwf6CRk5D4pw5UVDG4d634WpQ4yf',
    '41bVEdn56nNPqENPx4LewYqiiEW6pGG7yt4aXf1HTA9P'
];

export const getTokenHolders = async (req: Request, res: Response) => {
    try {
        const { tokenMint } = req.params;
        
        if (!tokenMint) {
            return res.status(400).json({
                success: false,
                error: 'Token mint address is required'
            });
        }

        console.log(`Checking token ${tokenMint} for ${walletAddresses.length} wallets...`);
        const holders = await getTokenHoldersByMint(tokenMint, walletAddresses);
        console.log(`Found ${holders.length} holders`);

        res.json({
            success: true,
            data: holders.map(holder => ({
                walletAddress: holder.walletAddress,
                tokenAmount: holder.tokenAmount
            }))
        });

    } catch (error) {
        console.error('Error in getTokenHolders:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 