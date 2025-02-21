import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    qualifyingToken: {
        mint: String,
        chain: {
            type: String,
            enum: ['ethereum', 'solana', 'base', 'bsc']
        },
        value: Number
    }
});

export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema); 