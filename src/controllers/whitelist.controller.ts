import { Request, Response } from 'express';
import { Whitelist } from '../db/models/whitelist';
import { validatePresaleWallet } from '../services/whitelist.service';

function determineChainFromAddress(walletAddress: string): string | null {
    // Ethereum and Base addresses (both start with 0x)
    if (/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        // Additional logic can be added here to differentiate between Ethereum and Base
        return 'ethereum';
    }

    // Solana addresses (base58 encoded, typically 32-44 characters)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        return 'solana';
    }

    // BSC addresses (also start with 0x)
    if (/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        // Additional logic can be added here to differentiate BSC from Ethereum
        return 'bsc';
    }

    return null;
}

export const addWalletToWhitelist = async (req: Request, res: Response) => {
    try {
        const { walletAddress, presale } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address and chain are required'
            });
        }

        console.log('Received wallet address:', walletAddress);
        console.log('Presale flag:', presale);

        // Validate presale wallet
        if (presale && !validatePresaleWallet(presale)) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is not in the presale list'
            });
        }

        const whitelistEntry = await Whitelist.findOneAndUpdate(
            { walletAddress },
            { $set: { lastUpdated: new Date(), presaleWallet: presale.toString() } },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            data: whitelistEntry
        });
    } catch (error) {
        console.error('Error adding wallet to whitelist:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};

export const getChainFromWalletAddress = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const chain = determineChainFromAddress(walletAddress);

        if (!chain) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        res.json({
            success: true,
            data: {
                walletAddress,
                chain
            }
        });
    } catch (error) {
        console.error('Error determining chain from wallet address:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};

export const isWalletInWhitelist = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const whitelistEntry = await Whitelist.findOne({ presaleWallet: walletAddress });

        if (!whitelistEntry) {
            return res.json({
                success: false,
                message: 'Wallet address is not in the whitelist'
            });
        }

        res.json({
            success: true,
            data: {
                walletAddress: whitelistEntry.walletAddress,
                chain: whitelistEntry.chain,
                lastUpdated: whitelistEntry.lastUpdated
            }
        });
    } catch (error) {
        console.error('Error checking wallet in whitelist:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
};

export const validatePresaleWalletAddress = async (req: Request, res: Response) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const isInPresaleList = validatePresaleWallet(walletAddress);

        if (!isInPresaleList) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is not in the presale list'
            });
        }

        const whitelistEntry = await Whitelist.findOne({ presaleWallet: walletAddress });

        if (!whitelistEntry) {
            return res.json({
                success: true,
                message: 'Wallet address is in the presale list',
                hasParticipated: false
            });
        }

        res.json({
            success: true,
            message: 'Wallet address is in the presale list',
            hasParticipated: true,
            wallet: whitelistEntry.walletAddress
        });
    } catch (error) {
        console.error('Error validating presale wallet address:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}; 