import { EVMWallet } from './wallets/evm.js';
import { SolanaWallet } from './wallets/solana.js';
import { NETWORKS } from '../../core/constants.js';
import { config } from '../../core/config.js';
import { db } from '../../core/database.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import { EventEmitter } from 'events';

class WalletService extends EventEmitter {
  constructor() {
    super();
    this.walletProviders = {
      [NETWORKS.ETHEREUM]: new EVMWallet(config.networks.ethereum),
      [NETWORKS.BASE]: new EVMWallet(config.networks.base),
      [NETWORKS.SOLANA]: new SolanaWallet(config.networks.solana)
    };
    this.walletCache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    try {
      this.usersCollection = db.getDatabase().collection('users');
      this.emit('initialized');
      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  getProvider(network) {
    const provider = this.walletProviders[network];
    if (!provider) {
      throw new Error(`Unsupported network: ${network}`);
    }
    return provider;
  }

  async createWallet(userId, network) {
    try {
      const provider = this.getProvider(network);
      const wallet = await provider.createWallet();

      const encryptedData = {
        address: wallet.address,
        encryptedPrivateKey: encrypt(wallet.privateKey),
        encryptedMnemonic: encrypt(wallet.mnemonic),
        createdAt: new Date()
      };

      await this.usersCollection.updateOne(
        { telegramId: userId.toString() },
        {
          $push: {
            [`wallets.${network}`]: encryptedData
          }
        },
        { upsert: true }
      );

      this.cacheWallet(userId, wallet.address, {
        ...wallet,
        network
      });

      this.emit('walletCreated', { userId, network, address: wallet.address });

      return wallet;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async getWallet(userId, address) {
    try {
      // Check cache first
      const cachedWallet = this.getFromCache(userId, address);
      if (cachedWallet) {
        return cachedWallet;
      }

      const user = await this.usersCollection.findOne(
        { telegramId: userId.toString() }
      );

      if (!user?.wallets) {
        return null;
      }

      for (const [network, wallets] of Object.entries(user.wallets)) {
        const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
        if (wallet) {
          const decryptedWallet = {
            address: wallet.address,
            network,
            privateKey: decrypt(wallet.encryptedPrivateKey),
            mnemonic: wallet.encryptedMnemonic ? decrypt(wallet.encryptedMnemonic) : null,
            createdAt: wallet.createdAt
          };

          this.cacheWallet(userId, address, decryptedWallet);
          return decryptedWallet;
        }
      }

      return null;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async getWallets(userId) {
    try {
      const user = await this.usersCollection.findOne(
        { telegramId: userId.toString() },
        { projection: { wallets: 1 } }
      );

      if (!user?.wallets) {
        return [];
      }

      const allWallets = [];
      for (const [network, wallets] of Object.entries(user.wallets)) {
        allWallets.push(...wallets.map(w => ({
          address: w.address,
          network,
          createdAt: w.createdAt
        })));
      }

      return allWallets;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async deleteWallet(userId, network, address) {
    try {
      const result = await this.usersCollection.updateOne(
        { telegramId: userId.toString() },
        {
          $pull: {
            [`wallets.${network}`]: { address }
          }
        }
      );

      if (result.modifiedCount > 0) {
        this.removeFromCache(userId, address);
        this.emit('walletDeleted', { userId, network, address });
        return true;
      }

      return false;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // Cache management methods
  cacheWallet(userId, address, walletData) {
    const key = `${userId}-${address}`;
    this.walletCache.set(key, {
      data: walletData,
      timestamp: Date.now()
    });
  }

  getFromCache(userId, address) {
    const key = `${userId}-${address}`;
    const cached = this.walletCache.get(key);

    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    if (cached) {
      this.walletCache.delete(key);
    }

    return null;
  }

  removeFromCache(userId, address) {
    const key = `${userId}-${address}`;
    this.walletCache.delete(key);
  }

  cleanup() {
    this.walletCache.clear();
    this.removeAllListeners();
    Object.values(this.walletProviders).forEach(provider => {
      if (provider.cleanup) {
        provider.cleanup();
      }
    });
  }
}

export const walletService = new WalletService();

// Set up periodic cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of walletService.walletCache.entries()) {
    if (now - value.timestamp > walletService.CACHE_DURATION) {
      walletService.walletCache.delete(key);
    }
  }
}, 300000); // Run every 5 minutes