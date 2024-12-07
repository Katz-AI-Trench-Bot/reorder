import { Command } from '../base/Command.js';
import { pumpFunService } from '../../services/pumpfun.js';
import { walletService } from '../../services/wallet/index.js';
import { USER_STATES } from '../../core/constants.js';

export class PumpFunCommand extends Command {
  constructor(bot) {
    super(bot);
    this.command = '/pump';
    this.description = 'Trade on Pump.fun';
    this.pattern = /^(\/pump|💊 Pump\.fun)$/;
  }

  async execute(msg) {
    const chatId = msg.chat.id;
    await this.handlePumpFunCommand(chatId, msg.from);
  }

  async handlePumpFunCommand(chatId, userInfo) {
    // Check if user has an active wallet
    const activeWallet = await walletService.getActiveWallet(userInfo.id);
    if (!activeWallet) {
      await this.showWalletRequiredMessage(chatId);
      return;
    }

    const loadingMsg = await this.showLoadingMessage(chatId, '😼 Loading PumpFun data...');

    try {
      const tokens = await pumpFunService.fetchLatestTokens();
      await this.deleteMessage(chatId, loadingMsg.message_id);

      const keyboard = this.createKeyboard([
        [{ text: '👀 Watch New Tokens', callback_data: 'pump_watch' }],
        [{ text: '💰 Buy Token', callback_data: 'pump_buy' }],
        [{ text: '💱 Sell Token', callback_data: 'pump_sell' }],
        [{ text: '↩️ Back to Menu', callback_data: '/start' }]
      ]);

      let message = '*PumpFun Trading* 💊\n\n';
      if (tokens?.length > 0) {
        message += '*Latest Tokens:*\n';
        tokens.slice(0, 5).forEach((token, index) => {
          message += `${index + 1}. ${token.symbol} - ${token.price}\n`;
        });
        message += '\n';
      }

      message += 'Select an action:\n\n' +
                '• Watch new token listings\n' +
                '• Buy tokens with SOL\n' +
                '• Sell tokens for SOL\n\n' +
                '_Note: All trades have 3% default slippage_';

      await this.simulateTyping(chatId);
      await this.bot.sendMessage(chatId, message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      });

    } catch (error) {
      console.error('Error fetching PumpFun data:', error);
      if (loadingMsg) {
        await this.deleteMessage(chatId, loadingMsg.message_id);
      }
      await this.showErrorMessage(chatId, error, 'retry_pump');
    }
  }

  async handleCallback(query) {
    const chatId = query.message.chat.id;
    const action = query.data;

    try {
      switch (action) {
        case 'pump_watch':
          await this.startTokenWatching(chatId);
          return true;

        case 'pump_buy':
          await this.showBuyForm(chatId);
          return true;

        case 'pump_sell':
          await this.showSellForm(chatId);
          return true;

        case 'retry_pump':
          await this.handlePumpFunCommand(chatId, query.from);
          return true;
      }
    } catch (error) {
      console.error('Error handling PumpFun action:', error);
      await this.showErrorMessage(chatId, error, 'retry_pump');
    }
    return false;
  }

  async startTokenWatching(chatId) {
    await this.setState(chatId, USER_STATES.WATCHING_PUMP_TOKENS);
    const msg = await this.bot.sendMessage(chatId, '👀 Watching for new tokens...');
    
    const callback = async (token) => {
      try {
        await this.simulateTyping(chatId);
        await this.bot.sendMessage(
          chatId,
          `🆕 *New Token Listed*\n\n` +
          `Symbol: ${token.symbol}\n` +
          `Price: ${token.price}\n` +
          `Time: ${new Date().toLocaleTimeString()}`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error in token callback:', error);
      }
    };  
    
    pumpFunService.subscribe('newToken', callback);
    
    // Cleanup subscription after 5 minutes
    setTimeout(async () => {
      pumpFunService.unsubscribe('newToken', callback);
      await this.bot.deleteMessage(chatId, msg.message_id);
      await this.bot.sendMessage(chatId, 'Token watching session ended.');
      await this.clearState(chatId);
    }, 5 * 60 * 1000);
  }

  async showBuyForm(chatId) {
    await this.bot.sendMessage(
      chatId,
      '*Buy Token* 💰\n\n' +
      'Enter the token address and amount to buy:\n\n' +
      'Format: `<token_address> <amount_in_sol>`',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '❌ Cancel', callback_data: 'back_to_pump' }
          ]]
        }
      }
    );
  }

  async showSellForm(chatId) {
    await this.bot.sendMessage(
      chatId,
      '*Sell Token* 💱\n\n' +
      'Enter the token address and amount to sell:\n\n' +
      'Format: `<token_address> <amount_in_tokens>`',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '❌ Cancel', callback_data: 'back_to_pump' }
          ]]
        }
      }
    );
  }

  async showWalletRequiredMessage(chatId) {
    await this.bot.sendMessage(
      chatId,
      '❌ Please select or create a Solana wallet first.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '👛 Go to Wallets', callback_data: '/wallets' }],
            [{ text: '↩️ Back to Menu', callback_data: '/start' }]
          ]
        }
      }
    );
  }
}