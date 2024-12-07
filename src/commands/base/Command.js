import { UserState } from '../../utils/userState.js';
import { createKeyboard } from '../../utils/keyboard.js';
import { ERROR_MESSAGES } from '../../core/constants.js';

export class Command {
  constructor(bot) {
    if (new.target === Command) {
      throw new Error('Command is an abstract class');
    }
    this.bot = bot;
    this.command = '';
    this.description = '';
    this.pattern = null;
  }

  register() {
    if (this.pattern) {
      this.bot.onText(this.pattern, (msg) => {
        this.execute(msg).catch(error => {
          console.error(`Error executing command ${this.command}:`, error);
          this.showErrorMessage(msg.chat.id, error);
        });
      });
    }
  }

  async execute(msg) {
    throw new Error('Command execute method must be implemented');
  }

  async handleCallback(query) {
    // Optional callback handler
    return false;
  }

  async handleInput(msg) {
    // Optional input handler
    return false;
  }

  createKeyboard(buttons, options = {}) {
    return createKeyboard(buttons, options);
  }

  async showErrorMessage(chatId, error, retryAction = null) {
    const keyboard = this.createKeyboard([[
      retryAction ? { text: '🔄 Retry', callback_data: retryAction } : null,
      { text: '↩️ Back to Menu', callback_data: '/start' }
    ].filter(Boolean)]);

    const errorMessage = ERROR_MESSAGES[error?.code] || error?.message || ERROR_MESSAGES.GENERAL_ERROR;

    await this.bot.sendMessage(chatId, errorMessage, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
  }

  async showLoadingMessage(chatId, message = '😼 Processing...') {
    return this.bot.sendMessage(chatId, message);
  }

  async deleteMessage(chatId, messageId) {
    try {
      await this.bot.deleteMessage(chatId, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  async simulateTyping(chatId, duration = 3000) {
    await this.bot.sendChatAction(chatId, 'typing');
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  // State management helpers
  async setState(userId, state) {
    await UserState.setState(userId, state);
  }

  async getState(userId) {
    return UserState.getState(userId);
  }

  async clearState(userId) {
    await UserState.clearUserState(userId);
  }

  async setUserData(userId, data) {
    await UserState.setUserData(userId, data);
  }

  async getUserData(userId) {
    return UserState.getUserData(userId);
  }
}