import { Router } from 'express';
import { 
    storeWalletAddress,
    getStoredWallets
} from '../controllers/wallet.controller';

const router = Router();

router.post('/:walletAddress', storeWalletAddress);
router.get('/', getStoredWallets);

export default router; 