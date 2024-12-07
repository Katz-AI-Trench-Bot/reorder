import { BaseWallet } from './base.js';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as bip39 from 'bip39';
import HDKey from 'hdkey';

export class SolanaWallet extends BaseWallet {
  constructor(networkConfig) {
    super(networkConfig);
    this.connection = new Connection(networkConfig.rpcUrl);
  }

  async createWallet() {
    try {
      const mnemonic = bip39.generateMnemonic();
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const hdkey = HDKey.fromMasterSeed(seed);
      const childKey = hdkey.derive("m/44'/501'/0'/0'");
      const keypair = Keypair.fromSeed(childKey.privateKey);

      return {
        address: keypair.publicKey.toString(),
        privateKey: Buffer.from(keypair.secretKey).toString('hex'),
        mnemonic
      };
    } catch (error) {
      console.error('Error creating Solana wallet:', error);
      throw error;
    }
  }

  async getBalance(address) {
    try {
      const pubkey = new PublicKey(address);
      const balance = await this.connection.getBalance(pubkey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting Solana balance:', error);
      throw error;
    }
  }

  async getTokenBalance(address, tokenAddress) {
    try {
      const pubkey = new PublicKey(address);
      const tokenPubkey = new PublicKey(tokenAddress);
      
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        pubkey,
        { mint: tokenPubkey }
      );

      if (tokenAccounts.value.length === 0) {
        return '0';
      }

      const balance = await this.connection.getTokenAccountBalance(
        tokenAccounts.value[0].pubkey
      );

      return balance.value.amount;
    } catch (error) {
      console.error('Error getting Solana token balance:', error);
      throw error;
    }
  }

  async signTransaction(transaction, privateKey) {
    try {
      const keypair = Keypair.fromSecretKey(
        Buffer.from(privateKey, 'hex')
      );
      transaction.sign(keypair);
      return transaction;
    } catch (error) {
      console.error('Error signing Solana transaction:', error);
      throw error;
    }
  }
}