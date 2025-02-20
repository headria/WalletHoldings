import { ethers } from 'ethers';
import axios from 'axios';
import { COMMON_TOKENS } from './config';

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

async function getTokenPrice(contractAddress: string): Promise<number | null> {
    try {
        const response = await axios.get(
            `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`
        );
        return response.data?.pairs?.[0]?.priceUsd || null;
    } catch (error) {
        console.error(`Error fetching price for ${contractAddress}:`, error);
        return null;
    }
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
        const tokens: TokenInfo[] = [];

        // Get ETH balance and price in parallel
        const [ethBalance, ethPrice] = await Promise.all([
            provider.getBalance(walletAddress),
            getTokenPrice('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
        ]);

        const formattedEthBalance = Number(ethers.formatEther(ethBalance));
        
        if (formattedEthBalance > 0.0001) {
            tokens.push({
                contractAddress: 'ETH',
                symbol: 'ETH',
                balance: formattedEthBalance,
                decimals: 18,
                price: ethPrice ?? 0,
                usdValue: ethPrice ? formattedEthBalance * ethPrice : 0
            });
        }

        // Check ERC20 tokens
        for (const contractAddress of COMMON_TOKENS) {
            try {
                const contract = new ethers.Contract(
                    contractAddress,
                    ERC20_ABI,
                    provider
                );

                const [balance, decimals, symbol] = await Promise.all([
                    contract.balanceOf(walletAddress),
                    contract.decimals(),
                    contract.symbol()
                ]);

                const balanceBigInt = BigInt(balance.toString());
                if (balanceBigInt === BigInt(0)) {
                    continue;
                }

                const divisor = BigInt(10 ** Number(decimals));
                const formattedBalance = Number(
                    (balanceBigInt * BigInt(10000) / divisor) / BigInt(10000)
                );

                if (formattedBalance > 0) {
                    const price = await getTokenPrice(contractAddress);
                    tokens.push({
                        contractAddress,
                        symbol,
                        balance: formattedBalance,
                        decimals: Number(decimals),
                        price: price ?? 0,
                        usdValue: price ? formattedBalance * price : 0
                    });
                }
            } catch (error) {
                console.error(`Error checking token ${contractAddress}`);
            }
        }

        return tokens;

    } catch (error) {
        console.error("Error:", error);
        return [];
    }
}

// Example usage