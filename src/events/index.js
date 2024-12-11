import { setupMessageHandler } from './message.js';
import { ErrorHandler } from '../core/errors/index.js';
import { circuitBreakers } from '../core/circuit-breaker/index.js';
import { BREAKER_CONFIGS } from '../core/circuit-breaker/index.js';

export function setupEventHandlers(bot, { rateLimiter }) {
  /**
   * Rate Limiting for Updates:
   * 
   * - Implemented rateLimiter.consume in a Middleware-like implementation to restrict users from spamming the bot.
   * - If they exceed the limit, they receive a warning message.
   */
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    try {
      // Apply rate limiter
      await rateLimiter.consume(userId);

      // Pass the message to the message handler
      await setupMessageHandler(bot, { rateLimiter }).handleMessage(msg);
    } catch (rateLimitError) {
      console.error(`Rate limit exceeded for user ${userId}:`, rateLimitError);

      // Notify the user about rate limit
      await bot.sendMessage(chatId, 'You are sending messages too quickly. Please slow down.');
    }
  });

  /**
   * Circuit Breakers for Bot Errors:
   * 
   * - Used circuitBreakers.executeWithBreaker to wrap bot-level error handling in a circuit breaker.
   * - Prevents repetitive failures from overwhelming the system.
   */
  bot.on('error', async (error) => {
    await circuitBreakers.executeWithBreaker(
      'bot_errors',
      async () => {
        console.error('Telegram bot error:', error);
        await ErrorHandler.handle(error, bot);
      },
      BREAKER_CONFIGS.botErrors // Circuit Breaker configuration for bot errors
    );
  });

  /**
   * Polling Errors with Circuit Breakers:
   * 
   * - Similar to bot errors, polling errors are now wrapped in a circuit breaker for resilience.
   */
  bot.on('polling_error', async (error) => {
    await circuitBreakers.executeWithBreaker(
      'polling_errors',
      async () => {
        console.error('Polling error:', error);
        await ErrorHandler.handle(error, bot);
      },
      BREAKER_CONFIGS.pollingErrors // Circuit Breaker configuration for polling errors
    );
  });

  console.log('🔧 Setting up message handlers...');
}
