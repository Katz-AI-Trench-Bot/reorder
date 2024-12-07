import { EventEmitter } from 'events';
import { NETWORKS, NETWORK_DISPLAY_NAMES } from '../../core/constants.js';
import { NetworkProvider } from './providers/base.js';
import { EVMProvider } from './providers/evm.js';
import { SolanaProvider } from './providers/solana.js';
import { UserState } from '../../utils/userState.js';

class NetworkService extends EventEmitter {
  constructor() {
    super();
    this.defaultNetwork = NETWORKS.ETHEREUM;
    this.providers = {
      [NETWORKS.ETHEREUM]: new EVMProvider(),
      [NETWORKS.BASE]: new EVMProvider(),
      [NETWORKS.SOLANA]: new SolanaProvider()
    };
    this.initialized = false;
  }

  async initialize() {
    try {
      await Promise.all(
        Object.values(this.providers).map(provider => provider.initialize())
      );
      this.initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      this.initialized = false;
      this.emit('error', error);
      throw error;
    }
  }

  async getCurrentNetwork(userId) {
    const userData = await UserState.getUserData(userId);
    return userData?.network || this.defaultNetwork;
  }

  async setCurrentNetwork(userId, network) {
    if (!Object.values(NETWORKS).includes(network)) {
      throw new Error(`Invalid network: ${network}`);
    }
    
    await UserState.setUserData(userId, { network });
    this.emit('networkChanged', { userId, network });
  }

  getNetworkDisplay(network) {
    return NETWORK_DISPLAY_NAMES[network] || network;
  }

  getProvider(network) {
    const provider = this.providers[network];
    if (!provider) {
      throw new Error(`Unsupported network: ${network}`);
    }
    return provider;
  }

  async getGasPrice(network) {
    const provider = this.getProvider(network);
    return provider.getGasPrice();
  }

  async getBlockNumber(network) {
    const provider = this.getProvider(network);
    return provider.getBlockNumber();
  }

  async isContractAddress(network, address) {
    const provider = this.getProvider(network);
    return provider.isContractAddress(address);
  }

  cleanup() {
    this.initialized = false;
    this.removeAllListeners();
    Object.values(this.providers).forEach(provider => {
      if (provider.cleanup) {
        provider.cleanup();
      }
    });
  }
}

export const networkService = new NetworkService();