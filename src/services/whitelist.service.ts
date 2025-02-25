import { Whitelist } from '../db/models/whitelist';

// Example list of presale wallet addresses
const presaleWallets = [
    '0x48760E6DdA33fae87b17bf6a8351C495E6D0F436',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '0x48760E6DdA33fae87b17bf6a8251C495E6D0F436',
    '0x3F74F4cB76d5AD3BeC20D9e8e01bf997d68EdEb1'
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