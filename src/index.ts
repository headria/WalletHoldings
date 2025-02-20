import dotenv from 'dotenv';
dotenv.config();

// Remove if it exists
// import dotenv from 'dotenv';
// dotenv.config();

import { Connection, GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import axios from "axios";
import { getAllEthereumTokens } from './ethereum';
import { getAllBaseTokens } from './base';
import { WALLET_ADDRESSES } from './config';
import connect from './db/config';
import { Token } from './db/models/token';

// List of fallback RPC endpoints
const RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana",
    "https://ssc-dao.genesysgo.net"
];

const JUPITER_PRICE_API = "https://price.jup.ag/v4/price";

// Add DexScreener API endpoint
const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/search";

// Add the specific token addresses we want to check
const TOKENS_TO_CHECK = [
    'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC',
    '61V8vBaqAGMpgDQi4JcAwo1dmBGHsyhzodcPqnEVpump',
    'KENJSUYLASHUMfHyy5o4Hp2FdNqZg1AsUPhfH2kYvEP',
    '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
    'Hax9LTgsQkze1YFychnBLtFH8gYbQKtKfWKKg2SP6gdD',
    '74SBV4zDXxTRgv1pEMoECskKBkZHc2yGPnc7GYVepump'
];

// Function to try different RPC endpoints
async function getWorkingConnection(): Promise<Connection> {
    for (const endpoint of RPC_ENDPOINTS) {
        try {
            const connection = new Connection(endpoint, 'confirmed');
            // Test the connection
            await connection.getSlot();
            console.log(`Connected to ${endpoint}`);
            return connection;
        } catch (error) {
            console.log(`Failed to connect to ${endpoint}, trying next...`);
        }
    }
    throw new Error("Unable to connect to any Solana RPC endpoint");
}

interface TokenInfo {
    pubkey: string;
    mint: string;
    amount: number;
    decimals: number;
    usdValue?: number;
    price?: number;
}

async function getTokenPrice(mintAddress: string): Promise<number | null> {
    try {
        const response = await axios.get(`${JUPITER_PRICE_API}?ids=${mintAddress}`);
        return response.data.data[mintAddress]?.price || null;
    } catch (error) {
        console.error(`Error fetching price for ${mintAddress}:`, error);
        return null;
    }
}

async function getTokenPriceFromDexScreener(mintAddress: string): Promise<number | null> {
    try {
        const response = await axios.get(`${DEXSCREENER_API}/?q=${mintAddress}`);

        if (response.data.pairs && response.data.pairs.length > 0) {
            // Get the first pair that matches our token
            const pair = response.data.pairs[0];
            return Number(pair.priceUsd);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching price for ${mintAddress}:`, error instanceof Error ? error.message : error);
        return null;
    }
}

const getAllTokensHeldByWallet = async (walletAddress: string) => {
    try {
        // Connect to database
        await connect();

        const solanaConnection = await getWorkingConnection();
        const wallet = new PublicKey(walletAddress);

        console.log(`Fetching token accounts for ${walletAddress}...`);
        console.log('Checking for specific token holdings...\n');

        const response = await solanaConnection.getParsedTokenAccountsByOwner(
            wallet,
            {
                programId: TOKEN_PROGRAM_ID,
            },
            'confirmed'
        );

        if (!response.value.length) {
            console.log(`No tokens found for wallet ${walletAddress}`);
            return;
        }

        // Parse and filter accounts, focusing on our specific tokens
        const tokens: TokenInfo[] = response.value
            .map((account) => {
                const parsedInfo = account.account.data.parsed.info;
                return {
                    pubkey: account.pubkey.toString(),
                    mint: parsedInfo.mint,
                    amount: Number(parsedInfo.tokenAmount.uiAmount),
                    decimals: parsedInfo.tokenAmount.decimals,
                };
            })
            .filter((token) => {
                // Only keep tokens with positive balance AND in our check list
                return token.amount > 0 && TOKENS_TO_CHECK.includes(token.mint);
            });

        // First display tokens we're checking for
        console.log("Checking for these tokens:");
        TOKENS_TO_CHECK.forEach((tokenMint, index) => {
            console.log(`${index + 1}. ${tokenMint}`);
        });
        console.log("\n");

        if (tokens.length === 0) {
            console.log("No matching tokens with positive balance found");

            // Show which tokens were not found
            console.log("\nTokens not found in wallet:");
            TOKENS_TO_CHECK.forEach(tokenMint => {
                console.log(`❌ ${tokenMint}`);
            });
            return;
        }

        // Fetch prices using DexScreener
        let totalPortfolioValue = 0;
        try {
            console.log("Fetching current market prices from DexScreener...");

            for (const token of tokens) {
                try {
                    const price = await getTokenPriceFromDexScreener(token.mint);
                    if (price) {
                        token.price = price;
                        token.usdValue = token.amount * price;
                        totalPortfolioValue += token.usdValue;
                    }
                    await new Promise(resolve => setTimeout(resolve, 250));
                } catch (error) {
                    console.warn(`Failed to fetch price for token ${token.mint}`);
                }
            }
        } catch (error) {
            console.error("Error in price fetching:", error instanceof Error ? error.message : error);
        }

        // Bulk upsert to database
        const bulkOps = tokens.map(token => ({
            updateOne: {
                filter: {
                    wallet: walletAddress,
                    mint: token.mint,
                    chain: 'solana'
                },
                update: {
                    $set: {
                        amount: token.amount,
                        price: token.price,
                        value: token.usdValue,
                        lastUpdated: new Date()
                    }
                },
                upsert: true
            }
        }));
        if (bulkOps.length > 0) {
            await Token.bulkWrite(bulkOps as any); // Type assertion needed due to chain type mismatch
            console.log(`Updated ${bulkOps.length} token records in database`);
        }

        // Display results with found/not found status
        console.log("\nToken Holdings Found:");
        console.log("====================");

        // Show found tokens
        tokens.forEach((token, index) => {
            console.log(`\n✅ Token ${index + 1}: ${token.mint}`);
            console.log(`   Amount: ${token.amount.toLocaleString()}`);
            console.log(`   Current Price: $${token.price?.toFixed(4) || 'Unknown'}`);
            console.log(`   Total Value: $${token.usdValue?.toFixed(2) || 'Unknown'}`);
        });

        // Show tokens not found
        console.log("\nTokens Not Found:");
        console.log("================");
        TOKENS_TO_CHECK
            .filter(mint => !tokens.some(t => t.mint === mint))
            .forEach(mint => {
                console.log(`❌ ${mint}`);
            });

        console.log("\nSummary:");
        console.log("========");
        console.log(`Total Matching Tokens Found: ${tokens.length} out of ${TOKENS_TO_CHECK.length}`);
        console.log(`Total Value of Found Tokens: $${totalPortfolioValue.toFixed(2)}`);

    } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
    }
};

async function getWalletTokens(chainType: 'ethereum' | 'solana' | 'base') {
    const walletAddress = WALLET_ADDRESSES[chainType];
    console.log(`Checking ${chainType} wallet: ${walletAddress}`);

    try {
        if (chainType === 'ethereum') {
            await getAllEthereumTokens(walletAddress);
        } else if (chainType === 'solana') {
            await getAllTokensHeldByWallet(walletAddress);
        } else if (chainType === 'base') {
            await getAllBaseTokens(walletAddress);
        } else {
            throw new Error('Unsupported chain type');
        }
    } catch (error) {
        console.error('Error getting wallet tokens:', error);
    }
}

// Check all networks
async function checkAllNetworks() {
    console.log("Checking all networks...\n");
    await getWalletTokens('ethereum');
    console.log("\n-------------------\n");
    await getWalletTokens('base');
    console.log("\n-------------------\n");
    await getWalletTokens('solana');
}

// Run checks
// checkAllNetworks();
