import { startMonitoringDashboard } from './Dashboard.js';
import { healthMonitor } from '../health/index.js';
import { rateLimiters } from '../rate-limiting/index.js';

export function setupMonitoring() {
  // Start monitoring dashboard
  startMonitoringDashboard();

  // Set up metrics collection
  const metrics = {
    requests: new Map(),
    errors: new Map(),
    performance: new Map()
  };

  // Monitor rate limits
  Object.entries(rateLimiters).forEach(([action, limiter]) => {
    limiter.on('limited', ({ userId }) => {
      metrics.requests.set(action, (metrics.requests.get(action) || 0) + 1);
    });
  });

  // Monitor errors
  healthMonitor.on('error', (error) => {
    const type = error.type || 'unknown';
    metrics.errors.set(type, (metrics.errors.get(type) || 0) + 1);
  });

  // Expose metrics endpoint
  healthMonitor.addEndpoint('/metrics', () => ({
    requests: Object.fromEntries(metrics.requests),
    errors: Object.fromEntries(metrics.errors),
    performance: Object.fromEntries(metrics.performance),
    uptime: process.uptime()
  }));

  return {
    metrics,
    cleanup: () => {
      metrics.requests.clear();
      metrics.errors.clear();
      metrics.performance.clear();
    }
  };
}