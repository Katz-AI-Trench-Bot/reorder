import mongoose from 'mongoose';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from './config.js';
import { DB_POOL_SIZE, DB_IDLE_TIMEOUT, DB_CONNECT_TIMEOUT } from './constants.js';
import { EventEmitter } from 'events';

class Database extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.database = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async connect() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  async _initialize() {
    try {
      mongoose.set('strictQuery', false);
      
      const mongooseOptions = {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: DB_POOL_SIZE,
        minPoolSize: 2,
        connectTimeoutMS: DB_CONNECT_TIMEOUT,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 30000,
        family: 4,
        retryWrites: true,
        w: 'majority',
        keepAlive: true,
        keepAliveInitialDelay: 300000
      };

      await mongoose.connect(config.mongoUri, mongooseOptions);

      this.client = new MongoClient(config.mongoUri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
        maxPoolSize: DB_POOL_SIZE,
        minPoolSize: 2,
        maxIdleTimeMS: DB_IDLE_TIMEOUT,
        connectTimeoutMS: DB_CONNECT_TIMEOUT,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 30000,
        keepAlive: true,
        keepAliveInitialDelay: 300000
      });

      await this.client.connect();
      this.database = this.client.db('KATZdatabase1');

      await mongoose.connection.db.command({ ping: 1 });
      await this.database.command({ ping: 1 });

      this._setupEventHandlers();

      console.log('Connected to MongoDB Atlas');
      this.isInitialized = true;
      this.emit('connected');
      
      return { client: this.client, database: this.database };
    } catch (error) {
      console.error('MongoDB connection error:', error);
      this.isInitialized = false;
      this.initializationPromise = null;
      this.emit('error', error);
      throw error;
    }
  }

  _setupEventHandlers() {
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB Atlas');
      this.emit('mongoose:connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
      this.emit('mongoose:error', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB Atlas');
      this.emit('mongoose:disconnected');
    });

    this.client.on('connectionPoolCleared', () => {
      console.log('Connection pool cleared');
      this.emit('pool:cleared');
    });
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      this.isInitialized = false;
      this.initializationPromise = null;
      console.log('Disconnected from MongoDB');
      this.emit('disconnected');
    } catch (error) {
      console.error('MongoDB disconnection error:', error);
      this.emit('error', error);
      throw error;
    }
  }

  getDatabase() {
    if (!this.isInitialized || !this.database) {
      throw new Error('Database not initialized. Call connect first.');
    }
    return this.database;
  }
}

export const db = new Database();

// Initialize connection on module load
db.connect().catch(console.error);