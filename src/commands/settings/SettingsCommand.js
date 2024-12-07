import { Command } from '../base/Command.js';
import { User } from '../../models/User.js';
import { networkService } from '../../services/network/index.js';
import { walletService } from '../../services/wallet/index.js';

export class SettingsCommand extends Command {
  constructor(bot) {
    super(bot);
    this.command = '/settings';
    this.description = 'Configure bot settings';
    this.pattern = /^(\/settings|⚙️ Settings)$/;
  }

  async execute(msg) {
    const chatId = msg.chat.id;
    await this.showSettingsMenu(chatId, msg.from);
  }

  async showSettingsMenu(chatId, userInfo) {
    try {
      const user = await User.findOne({ telegramId: userInfo.id.toString() });
      const currentNetwork = await networkService.getCurrentNetwork(userInfo.id);

      const keyboard = this.createKeyboard([
        [{ text: '🔄 Switch Network', callback_data: 'switch_network' }],
        [{ text: '🔔 Notification Settings', callback_data: 'notification_settings' }],
        [{ text: '🫅 Butler Assistant', callback_data: 'butler_assistant' }],
        [{ text: '🤖 Autonomous Wallet', callback_data: 'autonomous_wallet' }],
        [{ text: '↩️ Back to Menu', callback_data: '/start' }]
      ]);

      await this.bot.sendMessage(
        chatId,
        `*Settings* ⚙️\n\n` +
        `Current Network: *${networkService.getNetworkDisplay(currentNetwork)}*\n` +
        `Notifications: ${user?.settings?.notifications?.enabled ? '✅' : '❌'}\n` +
        `Butler: ${user?.settings?.butler?.enabled ? '✅' : '❌'}\n` +
        `Autonomous Wallet: ${user?.settings?.autonomousWallet?.address ? '✅' : '❌'}\n\n` +
        'Configure your preferences:',
        { 
          parse_mode: 'Markdown',
          reply_markup: keyboard 
        }
      );
    } catch (error) {
      console.error('Error showing settings menu:', error);
      await this.showErrorMessage(chatId, error, 'retry_settings');
    }
  }

  async handleCallback(query) {
    const chatId = query.message.chat.id;
    const action = query.data;
    const userInfo = query.from;

    try {
      switch (action) {
        case 'switch_network':
          await networkService.showNetworkSelection(this.bot, chatId);
          return true;

        case 'notification_settings':
          await this.showNotificationSettings(chatId, userInfo);
          return true;

        case 'butler_assistant':
          await this.showButlerSettings(chatId, userInfo);
          return true;

        case 'autonomous_wallet':
          await this.showAutonomousWalletSettings(chatId, userInfo);
          return true;

        case 'back_to_settings':
          await this.showSettingsMenu(chatId, userInfo);
          return true;

        default:
          if (action.startsWith('network_')) {
            const network = action.replace('network_', '');
            await networkService.setCurrentNetwork(userInfo.id, network);
            await this.showSettingsMenu(chatId, userInfo);
            return true;
          }
          if (action.startsWith('notifications_')) {
            await this.handleNotificationToggle(chatId, action, userInfo);
            return true;
          }
          if (action.startsWith('set_autonomous_')) {
            const walletAddress = action.replace('set_autonomous_', '');
            await this.handleAutonomousWalletSelection(chatId, walletAddress, userInfo);
            return true;
          }
      }
    } catch (error) {
      console.error('Error handling settings action:', error);
      await this.showErrorMessage(chatId, error, 'retry_settings');
    }
    return false;
  }

  // Additional methods for settings management...
  // Implementation continues with methods for handling different settings sections
}