import { BaseTrader } from './base.js';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { pumpFunService } from '../../pumpfun.js';

export class SolanaTrader extends BaseTrader {
  constructor(networkConfig) {
    super(networkConfig);
    this.connection = new Connection(networkConfig.rpcUrl);
  }

  async executeTrade({ action, tokenAddress, amount, walletAddress }) {
    try {
      // For Solana trades, we use PumpFun service
      const result = await pumpFunService.executeSwap({
        action,
        tokenAddress,
        amount,
        walletAddress
      });

      return {
        signature: result.signature,
        status: result.status,
        from: walletAddress,
        to: tokenAddress,
        amount: amount.toString()
      };
    } catch (error) {
      console.error('Solana trade error:', error);
      throw error;
    }
  }

  async estimateTrade({ action, tokenAddress, amount }) {
    try {
      const lamportsPerSignature = await this.connection.getRecentBlockhash()
        .then(res => res.feeCalculator.lamportsPerSignature);

      // Estimate additional overhead for token program calls
      const overhead = tokenAddress === 'native' ? 0 : 5000;

      return {
        estimatedFee: lamportsPerSignature + overhead,
        formattedFee: `${(lamportsPerSignature + overhead) / 1e9} SOL`
      };
    } catch (error) {
      console.error('Solana trade estimation error:', error);
      throw error;
    }
  }

  async getTokenPrice(tokenAddress) {
    try {
      const tokenMint = new PublicKey(tokenAddress);
      const tokenInfo = await Token.getTokenInfo(this.connection, tokenMint);
      return tokenInfo.price || 0;
    } catch (error) {
      console.error('Error getting Solana token price:', error);
      throw error;
    }
  }

  async getTradeHistory(walletAddress) {
    try {
      const pubkey = new PublicKey(walletAddress);
      const signatures = await this.connection.getSignaturesForAddress(pubkey);

      const history = await Promise.all(
        signatures.map(async (sig) => {
          const tx = await this.connection.getTransaction(sig.signature);
          return {
            signature: sig.signature,
            blockTime: sig.blockTime,
            fee: tx.meta.fee,
            status: tx.meta.err ? 'failed' : 'success'
          };
        })
      );

      return history;
    } catch (error) {
      console.error('Error getting Solana trade history:', error);
      throw error;
    }
  }
}