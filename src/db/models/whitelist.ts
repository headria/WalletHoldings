import mongoose from 'mongoose';

const whitelistSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    presaleWallet: {
        type: String,
        required: true
    }
});

export const Whitelist = mongoose.models.Whitelist || mongoose.model('Whitelist', whitelistSchema); 