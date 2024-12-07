// src/core/rate-limiting/RateLimiter.js
import { EventEmitter } from 'events';
import { db } from '../database.js';

export class RateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.windowMs = options.windowMs || 60000;
    this.max = options.max || 30;
    this.collection = db.getDatabase().collection('rateLimits');
  }

  async isRateLimited(userId, action) {
    const now = Date.now();
    const key = `${userId}:${action}`;

    try {
      const result = await this.collection.findOneAndUpdate(
        { key },
        {
          $push: {
            requests: {
              $each: [now],
              $position: 0
            }
          }
        },
        { upsert: true, returnDocument: 'after' }
      );

      const validRequests = result.requests.filter(
        timestamp => now - timestamp < this.windowMs
      );

      await this.collection.updateOne(
        { key },
        { $set: { requests: validRequests } }
      );

      return validRequests.length > this.max;
    } catch (error) {
      console.error('Rate limit check error:', error);
      this.emit('error', { userId, action, error });
      return false; // Fail open on errors
    }
  }

  async cleanup() {
    const now = Date.now();
    try {
      await this.collection.deleteMany({
        'requests.0': { $lt: now - this.windowMs }
      });
    } catch (error) {
      console.error('Rate limit cleanup error:', error);
      this.emit('error', { error });
    }
  }
}

// Create singleton instance
export const rateLimiter = new RateLimiter();

// Run cleanup every minute
setInterval(() => rateLimiter.cleanup(), 60000);
