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
    '0xDdbcDD8637d5CEDd15EeEe398108FCa05A71b32b'
];

const BSC_TOKENS_TO_CHECK = [
    "0x2A3350e8dAc29265c2b8Ded3789A27A702B0af2b",
    "0xf2c88757f8d03634671208935974b60a2a28bdb3",
    '0x5fd12bbb709a59c9f3bf9c690bff75edc6c4dcfd',
    '0x997a58129890bbda032231a52ed1ddc845fc18e1',
    '0xA18BBdCd86e4178d10eCd9316667cfE4C4AA8717',
    '0x054b568022e4bffc950e77a7aecc9c4787a6fa5d'
];

const TOKENS_MAP = {
    'solana': SOLANA_TOKENS_TO_CHECK,
    'ethereum': ETH_TOKENS_TO_CHECK,
    'base': BASE_TOKENS_TO_CHECK,
    'bsc': BSC_TOKENS_TO_CHECK
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
            const tokensSet = new Set(tokensToCheck.map(t => t.toLowerCase()));
            console.log(`Fetching data for ${chainId}, total tokens to check: ${tokensToCheck.length}`);

            const tokenMap = new Map<string, TokenInfo>(); // Use map for uniqueness
            const processedTokens = new Set<string>(); // Track processed tokens

            // Try to get cached data first
            const cachedData = await this.getCachedTokens(chainId);
            if (cachedData.length > 0) {
                console.log(`Using cached data for ${chainId}`);
                // Ensure cached data has no duplicates and is in our tokens list
                cachedData.forEach(token => {
                    const tokenLower = token.address.toLowerCase();
                    if (tokensSet.has(tokenLower)) {
                        const key = `${token.chainId}:${tokenLower}`;
                        if (!tokenMap.has(key)) {
                            tokenMap.set(key, token);
                        }
                    }
                });
                return Array.from(tokenMap.values());
            }

            if (chainId === 'solana') {
                for (const token of tokensToCheck) {
                    const tokenLower = token.toLowerCase();
                    if (processedTokens.has(tokenLower)) continue;

                    try {
                        const cachedToken = await this.getCachedToken(chainId, tokenLower);
                        if (cachedToken) {
                            const key = `${chainId}:${tokenLower}`;
                            if (!tokenMap.has(key)) {
                                tokenMap.set(key, cachedToken);
                                processedTokens.add(tokenLower);
                            }
                            continue;
                        }

                        console.log(`Fetching Solana token: ${token}`);
                        const url = `https://api.dexscreener.com/latest/dex/tokens/${token}`;
                        const response = await axios.get(url);

                        if (response.data.pairs?.[0]) {
                            const pair = response.data.pairs[0];
                            if (tokensSet.has(tokenLower)) {
                                const tokenInfo = {
                                    name: pair.baseToken.name || 'Unknown',
                                    symbol: pair.baseToken.symbol || 'UNKNOWN',
                                    price: parseFloat(pair.priceUsd) || 0,
                                    chainId: chainId,
                                    address: tokenLower
                                };

                                const key = `${chainId}:${tokenLower}`;
                                if (!tokenMap.has(key)) {
                                    tokenMap.set(key, tokenInfo);
                                    processedTokens.add(tokenLower);
                                    await this.cacheToken(chainId, tokenLower, tokenInfo);
                                    console.log(`Added ${pair.baseToken.symbol} with price $${pair.priceUsd}`);
                                }
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (err) {
                        console.error(`Error fetching Solana token ${token}:`, err);
                    }
                }
            } else {
                const batchSize = 3;
                const uniqueTokens = [...new Set(tokensToCheck.map(t => t.toLowerCase()))];

                for (let i = 0; i < uniqueTokens.length; i += batchSize) {
                    const batchTokens = uniqueTokens.slice(i, i + batchSize);

                    // Check cache for each token in batch
                    const uncachedTokens = [];
                    for (const token of batchTokens) {
                        const cachedToken = await this.getCachedToken(chainId, token);
                        if (cachedToken) {
                            const key = `${chainId}:${token}`;
                            if (!tokenMap.has(key)) {
                                tokenMap.set(key, cachedToken);
                                processedTokens.add(token);
                            }
                        } else {
                            uncachedTokens.push(token);
                        }
                    }

                    if (uncachedTokens.length === 0) continue;

                    try {
                        console.log(`Fetching ${chainId} batch:`, uncachedTokens);
                        const url = `https://api.dexscreener.com/latest/dex/tokens/${uncachedTokens.join(',')}`;
                        const response = await axios.get(url);

                        if (response.data.pairs?.length > 0) {
                            for (const pair of response.data.pairs) {
                                const address = pair.baseToken.address.toLowerCase();
                                if (!processedTokens.has(address) &&
                                    pair.baseToken &&
                                    pair.priceUsd &&
                                    tokensSet.has(address)) {
                                    const tokenInfo = {
                                        name: pair.baseToken.name || 'Unknown',
                                        symbol: pair.baseToken.symbol || 'UNKNOWN',
                                        price: parseFloat(pair.priceUsd) || 0,
                                        chainId: chainId,
                                        address: address
                                    };

                                    const key = `${chainId}:${address}`;
                                    if (!tokenMap.has(key)) {
                                        tokenMap.set(key, tokenInfo);
                                    }
                                    processedTokens.add(address);
                                    await this.cacheToken(chainId, address, tokenInfo);
                                    console.log(`Added ${pair.baseToken.symbol} with price $${pair.priceUsd}`);
                                }
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (err) {
                        console.error(`Error fetching ${chainId} batch:`, err);
                    }
                }
            }

            const uniqueTokens = Array.from(tokenMap.values());

            // Cache the full result
            if (uniqueTokens.length > 0) {
                await this.cacheTokens(chainId, uniqueTokens);
            }

            return uniqueTokens;
        } catch (error) {
            console.error(`Error in fetchDexScreenerData for ${chainId}:`, error);
            return [];
        }
    }

    private async getCachedToken(chainId: string, address: string): Promise<TokenInfo | null> {
        const key = `token:${chainId}:${address.toLowerCase()}`;
        const cached = await redisService.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    private async cacheToken(chainId: string, address: string, tokenInfo: TokenInfo): Promise<void> {
        const key = `token:${chainId}:${address.toLowerCase()}`;
        await redisService.set(key, JSON.stringify(tokenInfo), this.PRICE_TTL);
    }

    private async getCachedTokens(chainId: string): Promise<TokenInfo[]> {
        const key = `tokens:${chainId}`;
        const cached = await redisService.get(key);
        return cached ? JSON.parse(cached) : [];
    }

    private async cacheTokens(chainId: string, tokens: TokenInfo[]): Promise<void> {
        const key = `tokens:${chainId}`;
        await redisService.set(key, JSON.stringify(tokens), this.PRICE_TTL);
    }

    async getAllTokens(): Promise<TokenInfo[]> {
        try {
            const chains = ['solana', 'ethereum', 'base', 'bsc'];
            const tokenMap = new Map<string, TokenInfo>(); // Use map to ensure uniqueness

            await Promise.all(chains.map(async (chain) => {
                const freshData = await this.fetchDexScreenerData(chain);
                if (freshData.length > 0) {
                    freshData.forEach(token => {
                        const key = `${token.chainId}:${token.address.toLowerCase()}`;
                        if (!tokenMap.has(key)) {
                            tokenMap.set(key, token);
                        }
                    });
                }
            }));

            const uniqueTokens = Array.from(tokenMap.values());
            console.log(`Total unique tokens fetched: ${uniqueTokens.length}`);

            // Log breakdown by chain
            chains.forEach(chain => {
                const chainTokens = uniqueTokens.filter(token => token.chainId === chain);
                console.log(`${chain}: ${chainTokens.length} tokens`);
            });

            return uniqueTokens;

        } catch (error) {
            console.error('Error in getAllTokens:', error);
            return [];
        }
    }
}

export default new TokenService(); 