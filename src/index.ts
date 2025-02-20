// Remove if it exists
// import dotenv from 'dotenv';
// dotenv.config();

import { Connection, GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import axios from "axios";
import { getAllEthereumTokens } from './ethereum';
import { getAllBaseTokens } from './base';
import { WALLET_ADDRESSES } from './config';

// List of fallback RPC endpoints
const RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana",
    "https://ssc-dao.genesysgo.net"
];

const JUPITER_PRICE_API = "https://price.jup.ag/v4/price";

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

const getAllTokensHeldByWallet = async (walletAddress: string) => {
    try {
        const solanaConnection = await getWorkingConnection();
        const wallet = new PublicKey(walletAddress);

        console.log(`Fetching token accounts for ${walletAddress}...`);

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

        console.log(`Found ${response.value.length} token account(s) for wallet ${walletAddress}`);

        // Parse and filter accounts with balance
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
            .filter((token) => token.amount > 0);

        if (tokens.length === 0) {
            console.log("No tokens with positive balance found");
            return;
        }

        // Try to fetch prices with better error handling
        let totalPortfolioValue = 0;
        try {
            console.log("\nFetching current market prices...");
            // Split tokens into chunks to avoid URL length limits
            const CHUNK_SIZE = 100;
            for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
                const chunk = tokens.slice(i, i + CHUNK_SIZE);
                const mintAddresses = chunk.map(token => token.mint).join(',');
                
                try {
                    const priceResponse = await axios.get(`https://price.jup.ag/v4/price?ids=${mintAddresses}`);
                    const prices = priceResponse.data.data;

                    // Update prices for this chunk
                    chunk.forEach(token => {
                        const price = prices[token.mint]?.price;
                        if (price) {
                            token.price = price;
                            token.usdValue = token.amount * price;
                            totalPortfolioValue += token.usdValue;
                        }
                    });
                } catch (priceError: any) {
                    console.error(`Failed to fetch prices for chunk ${i / CHUNK_SIZE + 1}:`, priceError.message);
                }
            }
        } catch (priceError: any) {
            console.error("Error fetching prices:", priceError.message);
        }

        // Display results
        console.log("\nToken Holdings:");
        console.log("==============");

        tokens.forEach((token, index) => {
            console.log(`\nToken Account No. ${index + 1}: ${token.pubkey}`);
            console.log(`  Token Mint: ${token.mint}`);
            console.log(`  Amount: ${token.amount.toLocaleString()}`);
            console.log(`  Current Price: $${token.price?.toFixed(4) || 'Unknown'}`);
            console.log(`  Total Value: $${token.usdValue?.toFixed(2) || 'Unknown'}`);
        });

        console.log("\nPortfolio Summary:");
        console.log("==================");
        console.log(`Total Portfolio Value: $${totalPortfolioValue.toFixed(2)}`);
        console.log(`Total Unique Tokens: ${tokens.length}`);

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
checkAllNetworks();
