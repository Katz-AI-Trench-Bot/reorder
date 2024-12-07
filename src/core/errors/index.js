import { ErrorTypes, BaseError } from './ErrorTypes.js';

export class ErrorHandler {
  static async handle(error, bot, chatId) {
    console.error('Error:', error);

    // Map error types to user-friendly messages
    const errorMessages = {
      [ErrorTypes.RATE_LIMIT]: '⚠️ You are sending too many requests. Please wait a moment.',
      [ErrorTypes.NETWORK]: '❌ Network error. Please check your connection.',
      [ErrorTypes.DATABASE]: '❌ Service temporarily unavailable.',
      [ErrorTypes.VALIDATION]: '❌ Invalid input. Please check your data.',
      [ErrorTypes.AUTH]: '❌ Authentication failed. Please try again.',
      [ErrorTypes.WALLET]: '❌ Wallet operation failed. Please check your settings.',
      [ErrorTypes.API]: '❌ External service error. Please try again later.'
    };

    const message = errorMessages[error.type] || '❌ An unexpected error occurred.';
    
    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [[
          { text: '🔄 Retry', callback_data: 'retry_action' },
          { text: '↩️ Back to Menu', callback_data: '/start' }
        ]]
      }
    });

    // Log error for monitoring
    healthMonitor.logError(error);
  }
}

export { ErrorTypes, BaseError };