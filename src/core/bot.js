import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { setupCommands } from '../commands/index.js';
import { setupEventHandlers } from '../events/index.js';

class Bot {
  constructor() {
    this.instance = new TelegramBot(config.botToken, { polling: true });
    this.setupHandlers();
  }

  setupHandlers() {
    setupCommands(this.instance);
    setupEventHandlers(this.instance);
  }

  async stop() {
    if (this.instance) {
      await this.instance.stopPolling();
    }
  }
}

export const bot = new Bot().instance;