import { EventEmitter } from 'events';
import { db } from '../database.js';
import { ErrorHandler } from '../errors/index.js';

export class RateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.windowMs = options.windowMs || 60000; // Default rate limit window: 1 minute
    this.max = options.max || 1000; // Max requests per window
    this.inMemoryCache = new Map(); // Cache for quick access
    this.syncInterval = 600000; // Sync to DB every 10 minutes
    this.isInitialized = false;
  }

  async initialize() {
    if (!this.isInitialized) {
      try {
        console.log('✅ RateLimiter initialized successfully.');
        this.isInitialized = true;
        this.startSyncToDatabase();
      } catch (error) {
        console.error('❌ RateLimiter initialization failed:', error);
        await ErrorHandler.handle(error);
      }
    }
  }

  /** Check if user is rate-limited */
  async isRateLimited(userId, action) {
    try {
      const now = Date.now();
      const key = `${userId}:${action}`;

      // Check in-memory cache
      if (!this.inMemoryCache.has(key)) {
        this.inMemoryCache.set(key, []);
      }

      const requests = this.inMemoryCache.get(key).filter((timestamp) => now - timestamp < this.windowMs);

      // Update cache
      this.inMemoryCache.set(key, requests);

      if (requests.length >= this.max) {
        console.warn(`Rate limit exceeded for user ${userId}, action: ${action}`);
        return true;
      }

      // Add new request
      requests.push(now);
      return false;
    } catch (error) {
      console.error('Error in rate limit check:', error);
      await ErrorHandler.handle(error, null, null, { context: 'RateLimiter isRateLimited' });
      return false; // Fail open
    }
  }

  /** Sync in-memory data to the database periodically */
  async startSyncToDatabase() {
    setInterval(async () => {
      try {
        const now = Date.now();

        for (const [key, requests] of this.inMemoryCache.entries()) {
          const [userId, action] = key.split(':');
          const validRequests = requests.filter((timestamp) => now - timestamp < this.windowMs);

          // Update the database
          await db.collection('rateLimits').updateOne(
            { userId, action },
            { $set: { requests: validRequests } },
            { upsert: true }
          );

          // Clean up in-memory cache
          if (validRequests.length === 0) {
            this.inMemoryCache.delete(key);
          } else {
            this.inMemoryCache.set(key, validRequests);
          }
        }

        console.log('✅ RateLimiter synced with the database.');
      } catch (error) {
        console.error('❌ RateLimiter database sync failed:', error);
        await ErrorHandler.handle(error, null, null, { context: 'RateLimiter database sync' });
      }
    }, this.syncInterval);
  }

  async cleanup() {
    if (!this.isInitialized) return;

    try {
      // Sync final data to database
      await this.startSyncToDatabase();
      console.log('✅ RateLimiter cleanup completed.');
    } catch (error) {
      console.error('RateLimiter cleanup error:', error);
      await ErrorHandler.handle(error);
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
