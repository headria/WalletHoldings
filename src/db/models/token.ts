import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
    chain: {
        type: String,
        required: true,
        enum: ['ethereum', 'solana', 'base']
    },
    mint: {
        type: String,
        required: true
    },
    wallet: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    price: Number,
    value: Number,
    lastUpdated: Date
});

// Create compound index with background build
tokenSchema.index({ chain: 1, mint: 1, wallet: 1 }, { unique: true, background: true });

// Use existing model or create new one
export const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema); 