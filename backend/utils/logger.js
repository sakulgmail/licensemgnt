const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { combine, timestamp, printf, colorize, align } = winston.format;

// Create logs directory if it doesn't exist
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define log format
const format = combine(
  timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports (console and file)
const transports = [
  // Console transport with colorization
  new winston.transports.Console({
    format: combine(
      colorize(),
      printf(
        (info) =>
          `${info.timestamp} [${info.level}]: ${info.message} ${
            info.stack ? '\n' + info.stack : ''
          }`
      )
    ),
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 5 * 1024 * 1024, // 5MB
    maxFiles: 14, // Keep 14 days of logs
    tailable: true,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 14, // Keep 14 days of logs
    tailable: true,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  defaultMeta: { service: 'license-management' },
  transports,
  exitOnError: false, // Don't exit on handled exceptions
});

// Add a method to log HTTP requests
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit the process in production, let the process manager handle it
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production, let the process manager handle it
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

module.exports = logger;
