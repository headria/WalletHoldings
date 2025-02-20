import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
    chain: {
        type: String,
        required: true,
        enum: ['ethereum', 'solana', 'base'],
        index: true
    },
    mint: {
        type: String,
        required: true,
        index: true
    },
    wallet: {
        type: String,
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        default: 0
    },
    value: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Create a compound index for unique token per wallet
tokenSchema.index({ chain: 1, mint: 1, wallet: 1 }, { unique: true });

const Token = mongoose.models.Token || mongoose.model('Token', tokenSchema);

export { Token }; 