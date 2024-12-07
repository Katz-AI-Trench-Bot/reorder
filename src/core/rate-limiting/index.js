import { RateLimiter } from './RateLimiter.js';

// Create rate limiters for different actions
export const rateLimiters = {
  messages: new RateLimiter({ windowMs: 60000, max: 30 }), // 30 msgs/min
  trades: new RateLimiter({ windowMs: 300000, max: 10 }), // 10 trades/5min
  alerts: new RateLimiter({ windowMs: 60000, max: 5 }), // 5 alerts/min
  scans: new RateLimiter({ windowMs: 60000, max: 10 }) // 10 scans/min
};

export async function checkRateLimit(userId, action) {
  const limiter = rateLimiters[action];
  if (!limiter) return false;
  return limiter.isRateLimited(userId, action);
}