import Web3 from 'web3';
import { BSC_CONFIG } from '../config/bsc.config';
import { AbiItem } from 'web3-utils';
import { ERC20_ABI } from '../constants/abi';

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