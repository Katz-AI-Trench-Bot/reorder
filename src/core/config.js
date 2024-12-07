import dotenv from 'dotenv';
import { validateConfig } from '../utils/validation.js';
import { NETWORKS } from './constants.js';

dotenv.config();

const config = {
  botToken: process.env.BOT_TOKEN,
  openaiApiKey: process.env.OPENAI_API_KEY,
  smartContractAddress: process.env.SMART_CONTRACT_ADDRESS,
  mongoUri: process.env.MONGO_URI,
  mongoEncryptionKey: process.env.MONGO_ENCRYPTION_KEY,
  alchemyApiKey: process.env.ALCHEMY_API_KEY || 'ip7ONCr6sDycSojM_PZoWawrVM_2c0RW',
  solanaApiKey: process.env.SOLANA_API_KEY || 'ip7ONCr6sDycSojM_PZoWawrVM_2c0RW',
  networks: {
    [NETWORKS.ETHEREUM]: {
      name: 'Ethereum',
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      chainId: 1
    },
    [NETWORKS.BASE]: {
      name: 'Base',
      rpcUrl: process.env.BASE_RPC_URL,
      chainId: 8453
    },
    [NETWORKS.SOLANA]: {
      name: 'Solana',
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    }
  }
};

validateConfig(config);

export { config };