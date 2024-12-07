// src/core/monitoring/Dashboard.js
import express from 'express';
import { healthMonitor } from '../health/HealthMonitor.js';
import { rateLimiter } from '../rate-limiting/RateLimiter.js';

const app = express();

app.get('/health', async (req, res) => {
  const health = await healthMonitor.checkHealth();
  res.json(health);
});

app.get('/metrics', async (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    rateLimits: await rateLimiter.getMetrics()
  };
  res.json(metrics);
});

export function startMonitoringDashboard(port = 3000) {
  app.listen(port, () => {
    console.log(`Monitoring dashboard running on port ${port}`);
  });
}
