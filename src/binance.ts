import { bscService } from './services/bsc.service';

interface BscToken {
    contractAddress: string;
    balance: number;
    price: number;
    usdValue: number;
    name: string;
}

export const BSC_TOKENS_TO_CHECK = [
    "0x2A3350e8dAc29265c2b8Ded3789A27A702B0af2b",
    "0xf2c88757f8d03634671208935974b60a2a28bdb3",
    '0x5fd12bbb709a59c9f3bf9c690bff75edc6c4dcfd',
    '0x997a58129890bbda032231a52ed1ddc845fc18e1',
    '0xA18BBdCd86e4178d10eCd9316667cfE4C4AA8717'
];

export async function getAllBinanceTokens(walletAddress: string) {
    console.log(`[BSC] Checking tokens for wallet: ${walletAddress}`);
    const tokens = [];

    for (const tokenAddress of BSC_TOKENS_TO_CHECK) {
        try {
            const priceResult = await bscService.getTokenPrice(tokenAddress, walletAddress);
            
            if (priceResult && priceResult.balance > 0) {
                // Pass through the exact data we got from bscService
                tokens.push(priceResult);
                console.log(`[BSC] Added token with data:`, priceResult);
            }
        } catch (error) {
            console.error(`[BSC] Error checking token ${tokenAddress}:`, error);
        }
    }

    return tokens;
} 