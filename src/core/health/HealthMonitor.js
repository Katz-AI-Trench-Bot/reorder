// src/core/health/HealthMonitor.js
import { EventEmitter } from 'events';
import { db } from '../database.js';
import { networkService } from '../../services/network/index.js';
import { walletService } from '../../services/wallet/index.js';
import { pumpFunService } from '../../services/pumpfun.js';

export class HealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.setupChecks();
    this.startMonitoring();
  }

  setupChecks() {
    // Database health check
    this.addCheck('database', async () => {
      await db.getDatabase().command({ ping: 1 });
      return { status: 'healthy' };
    });

    // Network service health check
    this.addCheck('networks', async () => {
      const statuses = await networkService.checkAllNetworks();
      return { status: 'healthy', details: statuses };
    });

    // Wallet service health check
    this.addCheck('walletService', async () => {
      const status = await walletService.checkHealth();
      return { status: 'healthy', details: status };
    });

    // PumpFun service health check
    this.addCheck('pumpFun', async () => {
      const status = await pumpFunService.checkConnection();
      return { status: 'healthy', details: status };
    });
  }

  addCheck(name, checkFn) {
    this.services.set(name, checkFn);
  }

  async checkHealth() {
    const results = {};
    for (const [name, checkFn] of this.services) {
      try {
        results[name] = await checkFn();
      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message
        };
        this.emit('serviceError', { service: name, error });
      }
    }
    return results;
  }

  startMonitoring() {
    setInterval(async () => {
      const health = await this.checkHealth();
      this.emit('healthCheck', health);
      
      // Check for critical issues
      const criticalServices = ['database', 'networks'];
      const criticalIssues = criticalServices
        .filter(service => health[service]?.status === 'error');
      
      if (criticalIssues.length > 0) {
        this.emit('criticalError', {
          services: criticalIssues,
          health
        });
      }
    }, 60000); // Check every minute
  }

  cleanup() {
    this.removeAllListeners();
    clearInterval(this.monitoringInterval);
  }
}

export const healthMonitor = new HealthMonitor();

// Handle critical errors
healthMonitor.on('criticalError', async ({ services, health }) => {
  console.error('Critical service failure:', services);
  // Implement notification/alerting system
});
