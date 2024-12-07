// src/index.js
import dotenv from 'dotenv';
dotenv.config();

import { bot } from './core/bot.js';
import { setupCommands } from './commands/index.js';
import { setupEventHandlers } from './events/index.js';
import { callbackRegistry } from './utils/callbackRegistry.js';
import { db } from './core/database.js';
import { pumpFunService } from './services/pumpfun.js';
import { walletService } from './services/wallet.js';
import { networkService } from './services/network/index.js';
import { healthMonitor } from './core/health/HealthMonitor.js';
import { rateLimiter } from './core/rate-limiting/RateLimiter.js';
import { startMonitoringDashboard } from './core/monitoring/Dashboard.js';
import { setTimeout } from 'timers/promises';

let isShuttingDown = false;

async function cleanup(botInstance) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('🛑 Shutting down bot...');
  try {
    await db.disconnect();
    pumpFunService.disconnect();
    walletService.cleanup();
    networkService.cleanup();
    callbackRegistry.cleanup();
    healthMonitor.cleanup();

    if (botInstance) {
      await botInstance.stopPolling();
    }

    console.log('✅ Cleanup completed.');
    isShuttingDown = false;
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

async function startBot() {
  try {
    console.log('🚀 Starting KATZ Bot...');

    console.log('📡 Connecting to MongoDB Atlas...');
    await db.connect();

    console.log('🔧 Initializing services...');
    await Promise.all([
      walletService.initialize(),
      networkService.initialize(),
      callbackRegistry.initialize(),
    ]);

    console.log('⚡ Connecting to PumpFun service...');
    await pumpFunService.connect();

    console.log('🤖 Initializing Telegram bot...');
    const botInstance = bot;

    console.log('📜 Setting up command handlers...');
    setupCommands(botInstance);

    console.log('🎛 Setting up event handlers...');
    setupEventHandlers(botInstance);

    console.log('⚠️ Setting up error handlers...');
    setupBotErrorHandlers(botInstance);

    console.log('🔍 Starting health monitoring...');
    healthMonitor.startMonitoring();

    console.log('📊 Starting monitoring dashboard...');
    startMonitoringDashboard();

    console.log('✅ KATZ Bot is up and running!');
    return botInstance;

  } catch (error) {
    console.error('❌ Error starting bot:', error);
    await cleanup(bot);
    process.exit(1);
  }
}

function setupBotErrorHandlers(botInstance) {
  botInstance.on('error', async (error) => {
    console.error('Telegram bot error:', error);
    await tryRestartBot();
  });

  botInstance.on('polling_error', async (error) => {
    console.error('Polling error:', error);
    await tryRestartBot();
  });

  botInstance.on('webhook_error', (error) => {
    console.error('Webhook error:', error);
  });

  // Handle rate limiting
  botInstance.on('message', async (msg) => {
    const isLimited = await rateLimiter.isRateLimited(msg.from.id, 'message');
    if (isLimited) {
      await botInstance.sendMessage(
        msg.chat.id,
        '⚠️ You are sending too many messages. Please wait a moment.'
      );
      return;
    }
  });

  // Monitor health status
  healthMonitor.on('criticalError', async ({ services }) => {
    console.error('Critical service failure:', services);
    await tryRestartBot();
  });

  process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT. Shutting down gracefully...');
    await cleanup(botInstance);
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM. Shutting down gracefully...');
    await cleanup(botInstance);
    process.exit(0);
  });

  process.on('unhandledRejection', async (error) => {
    console.error('❌ Unhandled promise rejection:', error);
    await tryRestartBot();
  });

  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught exception:', error);
    await tryRestartBot();
  });
}

async function tryRestartBot() {
  if (isShuttingDown) return;

  console.log('🔄 Attempting to restart the bot...');
  try {
    await cleanup(bot);
    await setTimeout(5000);
    await startBot();
  } catch (error) {
    console.error('❌ Failed to restart the bot:', error);
    process.exit(1);
  }
}

startBot().catch(async (error) => {
  console.error('❌ Unhandled error during startup:', error);
  await cleanup(bot);
  process.exit(1);
});
