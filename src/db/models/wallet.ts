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
    }
});

export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema); 