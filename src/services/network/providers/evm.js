import { NetworkProvider } from './base.js';
import { ethers } from 'ethers';
import { Alchemy } from 'alchemy-sdk';
import { config } from '../../../core/config.js';

export class EVMProvider extends NetworkProvider {
  constructor(networkConfig) {
    super();
    this.networkConfig = networkConfig;
    this.provider = null;
    this.alchemy = null;
  }

  async initialize() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.networkConfig.rpcUrl);
      this.alchemy = new Alchemy({
        apiKey: config.alchemyApiKey,
        network: this.networkConfig.name.toLowerCase()
      });
      return true;
    } catch (error) {
      console.error('Error initializing EVM provider:', error);
      throw error;
    }
  }

  async getGasPrice() {
    try {
      const gasPrice = await this.provider.getGasPrice();
      return {
        price: gasPrice.toString(),
        formatted: ethers.formatUnits(gasPrice, 'gwei')
      };
    } catch (error) {
      console.error('Error getting gas price:', error);
      throw error;
    }
  }

  async getBlockNumber() {
    try {
      return this.provider.getBlockNumber();
    } catch (error) {
      console.error('Error getting block number:', error);
      throw error;
    }
  }

  async isContractAddress(address) {
    try {
      const code = await this.provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      console.error('Error checking contract address:', error);
      throw error;
    }
  }

  cleanup() {
    if (this.provider.destroy) {
      this.provider.destroy();
    }
  }
}