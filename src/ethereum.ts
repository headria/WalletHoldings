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
    contractAddress: string;
    symbol: string;
    balance: number;
    decimals: number;
    usdValue?: number;
    price?: number;
}

export async function getAllEthereumTokens(walletAddress: string): Promise<void> {
    try {
        const provider = await getWorkingEthereumProvider();
        
        console.log(`\nChecking Ethereum wallet ${walletAddress}...`);
        
        let totalPortfolioValue = 0;
        const tokens: TokenInfo[] = [];

        // Get ETH balance for the provided wallet address
        const ethBalance = await provider.getBalance(walletAddress);
        const formattedEthBalance = Number(ethers.formatEther(ethBalance));
        
        // Only add ETH if balance is greater than 0.0001 to avoid dust
        if (formattedEthBalance > 0.0001) {
            console.log(`Found: ETH (Native) - Balance: ${formattedEthBalance}`);
            const ethPrice = await getTokenPrice('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2');
            const ethInfo: TokenInfo = {
                contractAddress: 'ETH',
                symbol: 'ETH',
                balance: formattedEthBalance,
                decimals: 18,
                price: ethPrice ?? 0,
                usdValue: ethPrice ? formattedEthBalance * ethPrice : 0
            };
            tokens.push(ethInfo);
            if (ethInfo.usdValue) totalPortfolioValue += ethInfo.usdValue;
        }

        // Check ERC20 tokens using the provided wallet address
        for (const contractAddress of COMMON_TOKENS) {
            try {
                const contract = new ethers.Contract(
                    contractAddress,
                    ERC20_ABI,
                    provider
                );

                console.log(`Checking token at address: ${contractAddress}`);
                
                const [balance, decimals, symbol] = await Promise.all([
                    contract.balanceOf(walletAddress),  // Use the provided wallet address
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
                    console.log(`Found: ${symbol} (${contractAddress}) - Balance: ${formattedBalance}`);
                    const tokenInfo: TokenInfo = {
                        contractAddress,
                        symbol,
                        balance: formattedBalance,
                        decimals: Number(decimals)
                    };

                    const price = await getTokenPrice(contractAddress);
                    if (price !== null) {
                        tokenInfo.price = price;
                        tokenInfo.usdValue = formattedBalance * price;
                        totalPortfolioValue += tokenInfo.usdValue;
                    }

                    tokens.push(tokenInfo);
                }
            } catch (error) {
                console.error(`Error checking token ${contractAddress}:`, error);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Display results only if tokens were found
        if (tokens.length > 0) {
            console.log("\nEthereum Token Holdings:");
            console.log("=======================");
            tokens.forEach((token) => {
                console.log(`${token.symbol}: ${token.balance.toLocaleString()} (${token.contractAddress})`);
                if (typeof token.price === 'number' && !isNaN(token.price)) {
                    console.log(`  Price: $${token.price.toFixed(4)}`);
                    console.log(`  Value: $${(token.usdValue || 0).toFixed(2)}`);
                } else {
                    console.log(`  Price: Unknown`);
                    console.log(`  Value: Unknown`);
                }
            });

            console.log("\nPortfolio Summary:");
            console.log("==================");
            console.log(`Total Unique Tokens Found: ${tokens.length}`);
            console.log(`Total Portfolio Value: $${totalPortfolioValue.toFixed(2)}`);
        } else {
            console.log("\nNo tokens found in this wallet");
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

// Example usage
const ethereumWallet = "0x05be14F0021283409D23a5837cd5C26A7c9440D6";
getAllEthereumTokens(ethereumWallet); 