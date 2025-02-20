import { Router } from 'express';
import { 
    getAllEthereumTokens, 
    getStoredEthereumTokens 
} from '../controllers/ethereum.controller';

const router = Router();

router.get('/tokens/:walletAddress', getAllEthereumTokens);
router.get('/stored-tokens/:walletAddress', getStoredEthereumTokens);

export default router; 