import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { ERC20_ABI } from './constants/abi';
import { bscService } from './services/bsc.service';

interface BscToken {
    contractAddress: string;
    balance: number;
    price?: number;
    usdValue?: number;
}

export const BSC_TOKENS_TO_CHECK = [
    "0x2A3350e8dAc29265c2b8Ded3789A27A702B0af2b",
    "0xf2c88757f8d03634671208935974b60a2a28bdb3",
    '0x5fd12bbb709a59c9f3bf9c690bff75edc6c4dcfd',
    '0x997a58129890bbda032231a52ed1ddc845fc18e1',
    '0xA18BBdCd86e4178d10eCd9316667cfE4C4AA8717'
];

const BSC_RPC_URL = 'https://bsc-dataseed1.binance.org';
const web3 = new Web3(new Web3.providers.HttpProvider(BSC_RPC_URL));

export async function getAllBinanceTokens(walletAddress: string) {
    console.log(`[BSC] Checking tokens for wallet: ${walletAddress}`);


    const tokens = [];

    for (const tokenAddress of BSC_TOKENS_TO_CHECK) {
        try {
            console.log(`[BSC] Checking token ${tokenAddress}...`);

            // Verify if address is a valid contract first
            const isContract = await bscService.isContract(tokenAddress);
            if (!isContract) {
                console.log(`[BSC] Address ${tokenAddress} is not a valid contract, skipping...`);
                continue;
            }

            const result = await bscService.getTokenBalance(tokenAddress, walletAddress);
            console.log(`[BSC] Token ${tokenAddress} balance:`, result);

            if (result && result.balance !== '0') {
                const normalizedBalance = parseFloat(result.balance) / Math.pow(10, result.decimals);
                tokens.push({
                    contractAddress: tokenAddress,
                    balance: normalizedBalance
                });
                console.log(`[BSC] Added token ${tokenAddress} with balance:`, normalizedBalance);
            } else {
                console.log(`[BSC] Token ${tokenAddress} has zero balance or invalid response`);
            }
        } catch (error) {
            console.error(`[BSC] Error checking token ${tokenAddress}:`, error);
        }
    }

    console.log(`[BSC] Total tokens found: ${tokens.length}`);
    return tokens;
} 