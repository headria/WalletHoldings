import { ethers } from 'ethers';
import axios from 'axios';

// Standard ERC20 ABI for balanceOf function
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

export interface TokenInfo {
    contractAddress: string;
    symbol: string;
    balance: number;
    decimals: number;
    usdValue?: number;
    price?: number;
}

// Update price API for Base tokens
async function getTokenPrice(contractAddress: string): Promise<number | null> {
    try {
        // Use Base-specific price API or alternative for Base network
        const response = await axios.get(
            `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`
        );
        return response.data?.pairs?.[0]?.priceUsd || null;
    } catch (error) {
        console.error(`Error fetching price for ${contractAddress}:`, error);
        return null;
    }
}

// Update Base RPC endpoints to ensure we're on Base network
const BASE_RPC_ENDPOINTS = [
    "https://mainnet.base.org",
    "https://1rpc.io/base",
    "https://base.blockpi.network/v1/rpc/public",
    "https://base.meowrpc.com"
];

async function getWorkingBaseProvider(): Promise<ethers.Provider> {
    for (const endpoint of BASE_RPC_ENDPOINTS) {
        try {
            const provider = new ethers.JsonRpcProvider(endpoint, {
                chainId: 8453,  // Base mainnet chain ID
                name: 'base'
            });
            await provider.getBlockNumber();
            console.log(`Connected to Base via ${endpoint}`);
            return provider;
        } catch (error) {
            console.log(`Failed to connect to ${endpoint}, trying next...`);
        }
    }
    throw new Error("Unable to connect to any Base RPC endpoint");
}

// Common Base tokens
const COMMON_BASE_TOKENS = [
    '0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825',
    '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b',
    '0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf',
    '0xb33ff54b9f7242ef1593d2c9bcd8f9df46c77935',
    '0x0c03ce270b4826ec62e7dd007f0b716068639f7b',
    '0x55cd6469f597452b5a7536e2cd98fde4c1247ee4'
];

export async function getAllBaseTokens(walletAddress: string): Promise<TokenInfo[]> {
    try {
        const provider = await getWorkingBaseProvider();

        console.log(`\nChecking ${COMMON_BASE_TOKENS.length} common tokens for wallet ${walletAddress}...`);

        let totalPortfolioValue = 0;
        const tokens: TokenInfo[] = [];

        for (const contractAddress of COMMON_BASE_TOKENS) {
            try {
                const contract = new ethers.Contract(
                    contractAddress,
                    ERC20_ABI,
                    provider
                );

                console.log(`Checking token at address: ${contractAddress}`);

                try {
                    const [balance, decimals, symbol] = await Promise.all([
                        contract.balanceOf(walletAddress),
                        contract.decimals(),
                        contract.symbol()
                    ]);

                    let formattedBalance;
                    try {
                        const balanceBigInt = BigInt(balance.toString());
                        const divisor = BigInt(10 ** Number(decimals));
                        const beforeDecimal = balanceBigInt / divisor;
                        const afterDecimal = balanceBigInt % divisor;

                        formattedBalance = Number(beforeDecimal.toString() + "." + afterDecimal.toString().padStart(Number(decimals), '0'));
                    } catch (conversionError) {
                        console.error(`Error converting balance for ${symbol}:`, conversionError);
                        continue;
                    }

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
                } catch (contractError: any) {
                    console.error(`Error reading token data for ${contractAddress}:`, contractError.message);
                }
            } catch (error: any) {
                console.error(`Error creating contract for ${contractAddress}:`, error.message);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Get Base ETH balance
        const ethBalance = await provider.getBalance(walletAddress);
        const formattedEthBalance = Number(ethers.formatEther(ethBalance));

        if (formattedEthBalance > 0) {
            console.log(`Found: ETH (Native) - Balance: ${formattedEthBalance}`);
            tokens.push({
                contractAddress: 'ETH',
                symbol: 'ETH',
                balance: formattedEthBalance,
                decimals: 18
            });
        }

        // Display results
        console.log("\nBase Token Holdings:");
        console.log("===================");
        tokens.forEach((token) => {
            console.log(`${token.symbol}: ${token.balance.toLocaleString()} (${token.contractAddress})`);
        });

        console.log("\nPortfolio Summary:");
        console.log("==================");
        console.log(`Total Unique Tokens Found: ${tokens.length}`);
        console.log(`Total Portfolio Value: $${totalPortfolioValue.toFixed(2)}`);

        return tokens;
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
} 