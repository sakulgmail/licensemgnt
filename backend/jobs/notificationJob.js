const cron = require('node-cron');
const { processContractExpirations } = require('../services/emailService');
const logger = require('../utils/logger');

// Time to run the job (9 AM daily)
const CRON_SCHEDULE = '0 9 * * *';
const TIMEZONE = 'Asia/Bangkok';

class NotificationJob {
  constructor() {
    this.job = null;
  }

  start() {
    if (this.job) {
      logger.warn('Notification job is already running');
      return;
    }

    logger.info('Starting notification job...');
    
    // Schedule the job to run daily at 9 AM
    this.job = cron.schedule(
      CRON_SCHEDULE,
      async () => {
        try {
          logger.info('Running contract expiration check...');
          await processContractExpirations(7); // Check for contracts expiring in the next 7 days
          logger.info('Contract expiration check completed');
        } catch (error) {
          logger.error('Error in notification job:', error);
        }
      },
      {
        scheduled: true,
        timezone: TIMEZONE,
      }
    );

    // Also run immediately on startup for testing
    process.nextTick(async () => {
      try {
        logger.info('Running initial contract expiration check...');
        await processContractExpirations(7);
        logger.info('Initial contract expiration check completed');
      } catch (error) {
        logger.error('Error in initial notification job:', error);
      }
    });
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Notification job stopped');
    }
  }
}

// Create a singleton instance
const notificationJob = new NotificationJob();

module.exports = notificationJob;
