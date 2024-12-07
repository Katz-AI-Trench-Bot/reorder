import { CommandRegistry } from './registry.js';

export function setupCommands(bot) {
  const registry = new CommandRegistry(bot);

  // Handle callback queries
  bot.on('callback_query', async (query) => {
    try {
      const handled = await registry.handleCallback(query);
      if (!handled) {
        console.warn('Unhandled callback query:', query.data);
      }
      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error('Error handling callback query:', error);
      await bot.answerCallbackQuery(query.id, {
        text: '❌ An error occurred',
        show_alert: true
      });
    }
  });

  // Handle messages
  bot.on('message', async (msg) => {
    try {
      await registry.handleMessage(msg);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  return registry;
}