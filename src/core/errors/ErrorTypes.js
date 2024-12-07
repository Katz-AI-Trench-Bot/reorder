// src/core/errors/ErrorTypes.js
export const ErrorTypes = {
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  NETWORK: 'NETWORK_ERROR',
  DATABASE: 'DATABASE_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  WALLET: 'WALLET_ERROR',
  API: 'API_ERROR'
};

export class BaseError extends Error {
  constructor(type, message, details = {}) {
    super(message);
    this.type = type;
    this.details = details;
    this.timestamp = new Date();
  }
}

export class RateLimitError extends BaseError {
  constructor(message, details) {
    super(ErrorTypes.RATE_LIMIT, message, details);
  }
}

export class NetworkError extends BaseError {
  constructor(message, details) {
    super(ErrorTypes.NETWORK, message, details);
  }
}

// Add other error classes...
