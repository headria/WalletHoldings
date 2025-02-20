import axios from 'axios';
import { redisService } from './redis.service';

interface TokenInfo {
    name: string;
    symbol: string;
    price: number;
    chainId: string;
    address: string;
}

interface DexScreenerToken {
    chainId: string;
    pairs: Array<{
        baseToken: {
            address: string;
            name: string;
            symbol: string;
        };
        priceUsd: string;
        chainId: string;
    }>;
}

const SOLANA_TOKENS_TO_CHECK = [
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

const BASE_TOKENS_TO_CHECK = [
    '0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825',
    '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b',
    '0xacfe6019ed1a7dc6f7b508c02d1b04ec88cc21bf',
    '0xb33ff54b9f7242ef1593d2c9bcd8f9df46c77935',
    '0x0c03ce270b4826ec62e7dd007f0b716068639f7b',
    '0x55cd6469f597452b5a7536e2cd98fde4c1247ee4',
    '0xd418dfe7670c21f682e041f34250c114db5d7789'
];

const ETH_TOKENS_TO_CHECK = [
    "0x5a3e6a77ba2f983ec0d371ea3b475f8bc0811ad5",
    "0x14feE680690900BA0ccCfC76AD70Fd1b95D10e16",
    "0xf94e7d0710709388bce3161c32b4eea56d3f91cc",
    "0x292fcdd1b104de5a00250febba9bc6a5092a0076",
    "0x44971abf0251958492fee97da3e5c5ada88b9185",
    "0x8FAc8031e079F409135766C7d5De29cf22EF897C",
    '0xadf7c35560035944e805d98ff17d58cde2449389',
    "0x7da2641000cbb407c329310c461b2cb9c70c3046",
    '0xEbcD1Cc56Db8ce89B4A83C037103c870998034C7',
];

const TOKENS_MAP = {
    'solana': SOLANA_TOKENS_TO_CHECK,
    'ethereum': ETH_TOKENS_TO_CHECK,
    'base': BASE_TOKENS_TO_CHECK
};

class TokenService {
    private readonly PRICE_TTL = 300; // 5 minutes in seconds
    private readonly INFO_TTL = 86400; // 24 hours in seconds

    private async clearCache(chain: string) {
        await redisService.set(`token_info:${chain}`, '', 1); // This will effectively clear the cache
    }

    private async fetchDexScreenerData(chainId: string): Promise<TokenInfo[]> {
        try {
            const tokensToCheck = TOKENS_MAP[chainId as keyof typeof TOKENS_MAP];
            console.log(`Fetching data for ${chainId}, total tokens to check: ${tokensToCheck.length}`);
            
            const tokenInfos: TokenInfo[] = [];
            const processedTokens = new Set<string>(); // Track processed tokens
            
            // For Solana, we need to fetch each token individually
            if (chainId === 'solana') {
                for (const token of tokensToCheck) {
                    if (processedTokens.has(token.toLowerCase())) {
                        console.log(`Skipping duplicate token: ${token}`);
                        continue;
                    }

                    try {
                        console.log(`Fetching Solana token: ${token}`);
                        const url = `https://api.dexscreener.com/latest/dex/tokens/${token}`;
                        const response = await axios.get(url);
                        
                        if (response.data.pairs && response.data.pairs.length > 0) {
                            const pair = response.data.pairs[0]; // Get first pair
                            if (pair.baseToken && pair.priceUsd) {
                                tokenInfos.push({
                                    name: pair.baseToken.name || 'Unknown',
                                    symbol: pair.baseToken.symbol || 'UNKNOWN',
                                    price: parseFloat(pair.priceUsd) || 0,
                                    chainId: chainId,
                                    address: token
                                });
                                processedTokens.add(token.toLowerCase());
                                console.log(`Added ${pair.baseToken.symbol} with price $${pair.priceUsd}`);
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay
                    } catch (err) {
                        console.error(`Error fetching Solana token ${token}:`, err);
                    }
                }
            } else {
                // For ETH and Base, we can batch the requests
                const batchSize = 3;
                const uniqueTokens = [...new Set(tokensToCheck.map(t => t.toLowerCase()))];
                
                for (let i = 0; i < uniqueTokens.length; i += batchSize) {
                    const batchTokens = uniqueTokens.slice(i, i + batchSize);
                    try {
                        console.log(`Fetching ${chainId} batch:`, batchTokens);
                        const url = `https://api.dexscreener.com/latest/dex/tokens/${batchTokens.join(',')}`;
                        const response = await axios.get(url);
                        
                        if (response.data.pairs && response.data.pairs.length > 0) {
                            // Process each pair
                            response.data.pairs.forEach((pair: any) => {
                                const address = pair.baseToken.address.toLowerCase();
                                if (!processedTokens.has(address) && pair.baseToken && pair.priceUsd) {
                                    tokenInfos.push({
                                        name: pair.baseToken.name || 'Unknown',
                                        symbol: pair.baseToken.symbol || 'UNKNOWN',
                                        price: parseFloat(pair.priceUsd) || 0,
                                        chainId: chainId,
                                        address: address
                                    });
                                    processedTokens.add(address);
                                    console.log(`Added ${pair.baseToken.symbol} with price $${pair.priceUsd}`);
                                }
                            });
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay
                    } catch (err) {
                        console.error(`Error fetching ${chainId} batch:`, err);
                    }
                }
            }

            console.log(`Successfully fetched ${tokenInfos.length} unique tokens for ${chainId}`);
            return tokenInfos;

        } catch (error) {
            console.error(`Error in fetchDexScreenerData for ${chainId}:`, error);
            return [];
        }
    }

    async getAllTokens(): Promise<TokenInfo[]> {
        try {
            const chains = ['solana', 'ethereum', 'base'];
            const allTokens: TokenInfo[] = [];

            for (const chain of chains) {
                console.log(`Processing chain: ${chain}`);
                const tokenInfoKey = `token_info:${chain}`;

                // Clear existing cache to force fresh data fetch
                await this.clearCache(chain);
                
                let tokenInfo: TokenInfo[] = [];
                const freshData = await this.fetchDexScreenerData(chain);
                
                if (freshData.length > 0) {
                    console.log(`Got fresh data for ${chain}: ${freshData.length} tokens`);
                    tokenInfo = freshData;
                    await redisService.set(
                        tokenInfoKey,
                        JSON.stringify(freshData),
                        this.INFO_TTL
                    );
                    allTokens.push(...tokenInfo);
                } else {
                    console.log(`No fresh data found for ${chain}`);
                }
            }

            console.log(`Total tokens fetched: ${allTokens.length}`);
            if (allTokens.length === 0) {
                console.log('No tokens found in any chain. Check token addresses and API responses.');
            }
            return allTokens;

        } catch (error) {
            console.error('Error in getAllTokens:', error);
            return [];
        }
    }
}

export default new TokenService(); 