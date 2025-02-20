import mongoose from 'mongoose';

const retweetVerificationSchema = new mongoose.Schema({
    tweetId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    walletAddress: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        default: true
    },
    verifiedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure unique combinations
retweetVerificationSchema.index({ tweetId: 1, userId: 1, walletAddress: 1 }, { unique: true });

export const RetweetVerification = mongoose.model('RetweetVerification', retweetVerificationSchema); 