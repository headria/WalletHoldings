import Web3 from 'web3';
import { BSC_CONFIG } from '../config/bsc.config';
import { AbiItem } from 'web3-utils';
import { ERC20_ABI } from '../constants/abi';
import axios from 'axios';
import { redisService } from '../services/redis.service';

interface DexScreenerResponse {
    schemaVersion: string;
    pairs: {
        chainId: string;
        baseToken: {
            address: string;
            name: string;
            symbol: string;
        };
        quoteToken: {
            address: string;
            name: string;
            symbol: string;
        };
        priceNative: string;
        priceUsd: string;
        pairAddress: string;
    }[];
}

interface TokenInfo {
    contractAddress: string;
    balance: number;
    price?: number;
    usdValue?: number;
    name?: string;
}

async function getTokenPrice(tokenAddress: string): Promise<{ price: number | null, name?: string }> {
    try {
        // Check cache first
        const cacheKey = `bsc:price:${tokenAddress}`;
        const nameKey = `bsc:name:${tokenAddress}`;
        const cachedPrice = await redisService.get(cacheKey);
        const cachedName = await redisService.get(nameKey);

        if (cachedPrice && cachedName) {
            return { price: parseFloat(cachedPrice), name: cachedName };
        }

        // Try DexScreener first
        const response = await axios.get<DexScreenerResponse>(
            `https://api.dexscreener.com/latest/dex/search/?q=${tokenAddress}`
        );

        if (response.data.pairs && response.data.pairs.length > 0) {
            const pair = response.data.pairs.find(p =>
                p.baseToken.address.toLowerCase() === tokenAddress.toLowerCase() &&
                p.chainId === 'bsc'
            );

            if (pair) {
                const price = Number(pair.priceUsd);
                const name = pair.baseToken.name;

                if (!isNaN(price) && price > 0) {
                    await redisService.set(cacheKey, price.toString(), 300);
                    await redisService.set(nameKey, name, 300);

                    return {
                        price,
                        name
                    };
                }
            }
        }

        // Fallback to PancakeSwap API
        try {
            const pancakeResponse = await axios.get(
                `https://api.pancakeswap.info/api/v2/tokens/${tokenAddress}`
            );
            if (pancakeResponse.data?.data) {
                const price = Number(pancakeResponse.data.data.price);
                const name = pancakeResponse.data.data.name;
                if (!isNaN(price) && price > 0) {
                    await redisService.set(cacheKey, price.toString(), 300);
                    await redisService.set(nameKey, name, 300);
                    return { price, name };
                }
            }
        } catch (pancakeError) {
            console.log(`[BSC Service] PancakeSwap fallback failed for ${tokenAddress}`);
        }

        console.log(`[BSC Service] No valid price found for token ${tokenAddress}`);
        return { price: null };
    } catch (error) {
        console.error(`[BSC Service] Error fetching price for ${tokenAddress}:`, error);
        return { price: null };
    }
}

class BscService {
    private web3Instances: Web3[];
    private currentRpcIndex: number;

    constructor() {
        this.web3Instances = BSC_CONFIG.RPC_URLS.map(url => new Web3(new Web3.providers.HttpProvider(url)));
        this.currentRpcIndex = 0;
        console.log(`[BSC Service] Initialized with ${this.web3Instances.length} RPC endpoints`);
    }

    private getWeb3(): Web3 {
        this.currentRpcIndex = (this.currentRpcIndex + 1) % this.web3Instances.length;
        console.log(`[BSC Service] Using RPC endpoint #${this.currentRpcIndex + 1}`);
        return this.web3Instances[this.currentRpcIndex];
    }

    async isContract(address: string): Promise<boolean> {
        try {
            const web3 = this.getWeb3();
            const code = await web3.eth.getCode(address);
            return code !== '0x';
        } catch (error) {
            console.error(`[BSC Service] Error checking if address is contract:`, error);
            return false;
        }
    }

    async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<{
        balance: string;
        decimals: number;
    }> {
        try {
            console.log(`[BSC Service] Getting balance for token ${tokenAddress}, wallet ${walletAddress}`);

            // Verify addresses
            if (!Web3.utils.isAddress(tokenAddress) || !Web3.utils.isAddress(walletAddress)) {
                throw new Error('Invalid address format');
            }

            // Verify contract exists
            const isValidContract = await this.isContract(tokenAddress);
            if (!isValidContract) {
                throw new Error('Token address is not a contract');
            }

            const web3 = this.getWeb3();
            const contract = new web3.eth.Contract(ERC20_ABI as AbiItem[], tokenAddress);

            console.log(`[BSC Service] Fetching balance and decimals...`);

            // Call methods separately for better error handling
            try {
                const balance = await contract.methods.balanceOf(walletAddress).call() as string;
                console.log(`[BSC Service] Raw balance:`, balance);

                const decimals = await contract.methods.decimals().call() as string;
                console.log(`[BSC Service] Decimals:`, decimals);

                return {
                    balance: balance.toString(),
                    decimals: Number(decimals)
                };
            } catch (methodError) {
                console.error(`[BSC Service] Contract method error:`, methodError);
                throw new Error('Failed to call contract methods');
            }
        } catch (error) {
            console.error(`[BSC Service] Error fetching BSC token ${tokenAddress} balance:`, error);
            throw error;
        }
    }

    async getTokenPrice(tokenAddress: string, walletAddress: string): Promise<TokenInfo | null> {
        try {
            console.log(`[BSC Service] Getting price for token ${tokenAddress}`);

            const response = await axios.get<DexScreenerResponse>(
                `https://api.dexscreener.com/latest/dex/search/?q=${tokenAddress}`
            );

            console.log(`[BSC Service] DexScreener response received, found ${response.data.pairs?.length || 0} pairs`);

            if (response.data.pairs && response.data.pairs.length > 0) {
                console.log(`[BSC Service] Looking for BSC pair with token ${tokenAddress}`);

                const pair = response.data.pairs.find(p =>
                    p.baseToken.address.toLowerCase() === tokenAddress.toLowerCase() &&
                    p.chainId === 'bsc'
                );

                if (pair) {
                    console.log(`[BSC Service] Found matching pair: ${pair.baseToken.name} (${pair.baseToken.address})`);
                    const price = Number(pair.priceUsd);
                    const name = pair.baseToken.name;

                    if (!isNaN(price) && price > 0) {
                        console.log(`[BSC Service] Valid price found: $${price}`);
                        const balanceResult = await this.getTokenBalance(tokenAddress, walletAddress);
                        const normalizedBalance = parseFloat(balanceResult.balance) / Math.pow(10, balanceResult.decimals);

                        return {
                            contractAddress: tokenAddress,
                            balance: normalizedBalance,
                            price,
                            name,
                            usdValue: normalizedBalance * price
                        };
                    } else {
                        console.log(`[BSC Service] Invalid price value: ${pair.priceUsd}`);
                    }
                } else {
                    console.log(`[BSC Service] No matching BSC pair found for token ${tokenAddress}`);
                }
            }

            console.log(`[BSC Service] No valid price data found for token ${tokenAddress}`);
            return null;
        } catch (error) {
            console.error(`[BSC Service] Error fetching token data:`, error);
            return null;
        }
    }

    async getBNBBalance(walletAddress: string): Promise<string> {
        try {
            const web3 = this.getWeb3();
            return (await web3.eth.getBalance(walletAddress)).toString();
        } catch (error) {
            console.error(`[BSC Service] Error fetching BNB balance:`, error);
            throw error;
        }
    }
}

export const bscService = new BscService(); 