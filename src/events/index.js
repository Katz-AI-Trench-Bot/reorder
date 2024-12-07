export * from './error.js';
export * from './message.js';

export function setupEventHandlers(bot) {
  setupMessageHandler(bot);
  setupErrorHandler(bot);
}