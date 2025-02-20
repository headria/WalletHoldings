import { Router } from 'express';
import { 
    getAllBaseTokens, 
    getStoredBaseTokens 
} from '../controllers/base.controller';

const router = Router();

router.get('/tokens/:walletAddress', getAllBaseTokens);
router.get('/stored-tokens/:walletAddress', getStoredBaseTokens);

export default router; 