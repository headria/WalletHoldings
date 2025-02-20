import { ethers } from 'ethers';
import axios from 'axios';
import { COMMON_TOKENS } from './config';

// Cache for token prices
const priceCache = new Map<string, { price: number, timestamp: number }>();
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 5; // Number of tokens to process in parallel

// Standard ERC20 ABI for balanceOf function
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

const ETH_RPC_ENDPOINTS = [
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://ethereum.publicnode.com",
    "https://eth.meowrpc.com"
];

async function getWorkingEthereumProvider(): Promise<ethers.Provider> {
    for (const endpoint of ETH_RPC_ENDPOINTS) {
        try {
            const provider = new ethers.JsonRpcProvider(endpoint, {
                chainId: 1,  // Ethereum mainnet
                name: 'mainnet'
            });
            await provider.getBlockNumber();
            console.log(`Connected to Ethereum via ${endpoint}`);
            return provider;
        } catch (error) {
            console.log(`Failed to connect to ${endpoint}, trying next...`);
        }
    }
    throw new Error("Unable to connect to any Ethereum RPC endpoint");
}

async function getTokenPriceWithCache(contractAddress: string): Promise<number | null> {
    const cached = priceCache.get(contractAddress);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_DURATION) {
        return cached.price;
    }
    
    try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/search/?q=${contractAddress}`);
        if (response.data.pairs && response.data.pairs.length > 0) {
            const price = Number(response.data.pairs[0].priceUsd);
            priceCache.set(contractAddress, { price, timestamp: Date.now() });
            return price;
        }
    } catch (error) {
        console.error(`Error fetching price for ${contractAddress}:`, error);
    }
    return null;
}

async function batchProcessTokens(tokens: string[], provider: ethers.Provider, walletAddress: string): Promise<TokenInfo[]> {
    const results = await Promise.all(tokens.map(async (contractAddress) => {
        try {
            const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
            
            const [balance, decimals, symbol, price] = await Promise.all([
                contract.balanceOf(walletAddress),
                contract.decimals(),
                contract.symbol(),
                getTokenPriceWithCache(contractAddress)
            ]);

            const formattedBalance = Number(ethers.formatUnits(balance, decimals));
            
            return {
                contractAddress,
                symbol,
                balance: formattedBalance,
                decimals: Number(decimals),
                price: price || 0,
                usdValue: price ? formattedBalance * price : 0
            } as TokenInfo;
        } catch (error) {
            console.error(`Error processing token ${contractAddress}:`, error);
            return null;
        }
    }));

    return results.filter((result): result is TokenInfo => result !== null && result.balance > 0);
}

export interface TokenInfo {
    contractAddress: string;  // This is what we get from the blockchain
    symbol: string;
    balance: number;
    decimals: number;
    usdValue?: number;
    price?: number;
}

export async function getAllEthereumTokens(walletAddress: string): Promise<TokenInfo[]> {
    try {
        const provider = await getWorkingEthereumProvider();
        console.log(`\nChecking Ethereum wallet ${walletAddress}...`);

        // Process tokens in batches
        const batches = [];
        for (let i = 0; i < COMMON_TOKENS.length; i += BATCH_SIZE) {
            batches.push(COMMON_TOKENS.slice(i, i + BATCH_SIZE));
        }

        const results = [];
        for (const batch of batches) {
            const batchResults = await batchProcessTokens(batch, provider, walletAddress);
            results.push(...batchResults);
        }

        // Calculate total portfolio value
        const totalPortfolioValue = results.reduce((sum, token) => 
            sum + (token?.usdValue ?? 0), 0
        );

        console.log('\nPortfolio Summary:');
        console.log('==================');
        console.log(`Total Tokens Found: ${results.length}`);
        console.log(`Total Portfolio Value: $${totalPortfolioValue.toFixed(2)}`);

        return results;

    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}

// Example usage