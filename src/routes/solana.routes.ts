import { Router } from 'express';
import { getSpecificTokens } from '../controllers/solana.controller';

const router = Router();

// GET /api/solana/tokens/:walletAddress
router.get('/tokens/:walletAddress', getSpecificTokens);

// Example usage:
// http://localhost:3000/api/solana/tokens/9JcJD8un5QMaDkwuEMzH56gtr3pkvqc3ftWPqwHHU9vR

export default router; 