import { Router } from 'express';
import { addWalletToWhitelist, getChainFromWalletAddress, isWalletInWhitelist, validatePresaleWalletAddress } from '../controllers/whitelist.controller';

const router = Router();

router.post('/whitelist', addWalletToWhitelist);
router.get('/chain/:walletAddress', getChainFromWalletAddress);
router.get('/check/:walletAddress', isWalletInWhitelist);
router.get('/validate-presale/:walletAddress', validatePresaleWalletAddress);

export default router; 