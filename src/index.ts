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

        const response = await solanaConnection.getTokenAccountsByOwner(
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
                const data = account.account.data;
                const info = Buffer.from(data);

                // Parse token account data
                const mint = new PublicKey(info.slice(0, 32));
                const amount = Number(BigInt('0x' + info.slice(64, 72).reverse().toString('hex')));
                const decimals = info[44];

                return {
                    pubkey: account.pubkey.toString(),
                    mint: mint.toString(),
                    amount: amount / Math.pow(10, decimals),
                    decimals: decimals,
                };
            })
            .filter((token) => token.amount > 0);

        if (tokens.length === 0) {
            console.log("No tokens with positive balance found");
            return;
        }

        // Fetch prices for all tokens
        console.log("\nFetching current market prices...");
        let totalPortfolioValue = 0;

        // Fetch prices for all tokens in parallel
        await Promise.all(
            tokens.map(async (token) => {
                const price = await getTokenPrice(token.mint);
                if (price !== null) {
                    token.price = price;
                    token.usdValue = token.amount * price;
                    totalPortfolioValue += token.usdValue;
                }
            })
        );

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
        if (error instanceof Error) {
            console.error("Error:", error.message);
        } else {
            console.error("Unknown error:", error);
        }
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
