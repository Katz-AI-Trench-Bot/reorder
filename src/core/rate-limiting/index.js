import { RateLimiter } from './RateLimiter.js';

// Centralized rate limit configurations
const RATE_LIMIT_CONFIGS = {
  messages: { windowMs: 60000, max: 3000 }, // 3000 msgs/min
  trades: { windowMs: 300000, max: 1000 }, // 1000 trades/5min
  alerts: { windowMs: 60000, max: 1000 }, // 1000 alerts/min
  scans: { windowMs: 60000, max: 1000 }, // 1000 scans/min
};

// Create rate limiters dynamically based on configurations
export const rateLimiters = Object.fromEntries(
  Object.entries(RATE_LIMIT_CONFIGS).map(([action, config]) => [
    action,
    new RateLimiter(config),
  ])
);

/**
 * Checks if a user exceeds the rate limit for a specific action.
 * @param {string} userId - The unique identifier for the user (e.g., Telegram user ID).
 * @param {string} action - The action to check (e.g., "messages", "trades").
 * @returns {Promise<boolean>} - True if rate limit exceeded, false otherwise.
 */
export async function checkRateLimit(userId, action) {
  const limiter = rateLimiters[action];
  if (!limiter) {
    console.warn(`Unknown action: ${action}. Using default rate limit.`);
    return false; // Default behavior for unknown actions
  }

  try {
    const isLimited = await limiter.isRateLimited(userId, action);
    if (isLimited) {
      console.warn(`User ${userId} exceeded rate limit for action: ${action}`);
    }
    return isLimited;
  } catch (error) {
    console.error(`Error checking rate limit for user ${userId} and action ${action}:`, error);
    return false; // Fail open on errors
  }
}

/**
 * Initializes all rate limiters before usage.
 */
export async function initializeRateLimiters() {
  try {
    await Promise.all(Object.values(rateLimiters).map((limiter) => limiter.initialize()));
    console.log('✅ All rate limiters initialized successfully.');
  } catch (error) {
    console.error('❌ Error initializing rate limiters:', error);
    throw error;
  }
}

// Periodic cleanup for all rate limiters
setInterval(async () => {
  try {
    await Promise.all(Object.values(rateLimiters).map((limiter) => limiter.cleanup()));
    console.log('✅ Periodic cleanup for rate limiters completed.');
  } catch (error) {
    console.error('❌ Error during rate limiter cleanup:', error);
  }
}, 600000); // Cleanup every 1 hour
