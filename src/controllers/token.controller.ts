import { Request, Response } from 'express';
import TokenService from '../services/token.service';

class TokenController {
  async getAllTokens(req: Request, res: Response) {
    try {
      const tokens = await TokenService.getAllTokens();
      res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      console.error('Error in getAllTokens:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch token information'
      });
    }
  }
}

export default new TokenController(); 