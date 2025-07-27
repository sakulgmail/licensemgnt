require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customers');
const vendorRoutes = require('./routes/vendors');
const licenseRoutes = require('./routes/licenses');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');

// Import database configuration
const { pool } = require('./config/db');

// Import scheduler
const { initScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with detailed logging
app.use((req, res, next) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Log the request
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
    body: req.body
  });
  
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Export pool for use in other modules
module.exports.pool = pool;

// Test database connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    logger.error('Error connecting to the database', { error: err });
  } else {
    logger.info('Successfully connected to the database');
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the License Management API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `The requested URL ${req.originalUrl} was not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });
  
  const statusCode = err.statusCode || 500;
  const response = {
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong!'
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  logger.info(`Server started on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Initialize the scheduler in non-test environment
  if (process.env.NODE_ENV !== 'test') {
    initScheduler().then(tasks => {
      logger.info(`Initialized ${tasks.length} scheduled notification tasks`);
    }).catch(error => {
      logger.error('Failed to initialize scheduler:', error);
    });
  }
  logger.info('Notification job started');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', { error: err.message, stack: err.stack });
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// For testing purposes
module.exports = { 
  app, 
  server,
  close: () => {
    notificationJob.stop();
    return new Promise((resolve) => {
      server.close(resolve);
    });
  }
};
