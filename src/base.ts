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
    "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
    "0x623cD3a3EdF080057892aaF8D773Bbb7A5C9b6e9", // WETH
    "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", // cbETH
    "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // USDbC
    "0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9", // BALD
    "0x27D2DECb4bFC9C76F0309b8E88dec3a601Fe25a8", // UNIDEX
    "0x9e1028F5F1D5eDE59748FFceE5532509976840E0", // COMP
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    "0xE3B53AF74a4BF62Ae5511055290838050bf764Df", // MIM
    "0x940181a94A35A4569E4529A3CDfB74e38FD98631"  // AERO
];

export async function getAllBaseTokens(walletAddress: string): Promise<void> {
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

    } catch (error) {
        console.error("Error:", error);
    }
} 