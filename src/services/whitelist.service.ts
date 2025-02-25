import { Whitelist } from '../db/models/whitelist';

// Example list of presale wallet addresses
const presaleWallets = [
    '0x48760e6dda33fae87b17bf6a8351c495e6d0f436',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '0x48760e6dda33fae87b17bf6a8251c495e6d0f436',
    '0x3f74f4cb76d5ad3bec20d9e8e01bf997d68edeb1',
    '0x3f74f4cb76d5ad3bec20d9e8e01bf997d68edeb1',
    '0x4458212a31e0577d0117795bc2907f5d804ecf8e',
    '0x4458212a31e0577d0117795bc2907f5d804ecf8e',
    '0x324756e75249ad288d8ff2164cfad291ed5879d7'

    // Add more addresses as needed
];

export const addWallet = async (walletAddress: string, chain: string, isPresale: boolean) => {
    return Whitelist.findOneAndUpdate(
        { walletAddress },
        { $set: { chain, lastUpdated: new Date(), isPresale } },
        { new: true, upsert: true }
    );
};

export const validatePresaleWallet = (walletAddress: string): boolean => {
    console.log('Validating wallet address:', walletAddress);
    const isValid = presaleWallets.includes(walletAddress);
    console.log('Is valid presale wallet:', isValid);
    return isValid;
}; 