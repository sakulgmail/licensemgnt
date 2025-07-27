const cron = require('node-cron');
const { processLicenseExpirations } = require('../services/emailService');
const logger = require('../utils/logger');

// Time to run the job (9 AM daily)
const CRON_SCHEDULE = '0 9 * * *';
const TIMEZONE = 'Asia/Bangkok';

class NotificationJob {
  constructor() {
    this.job = null;
  }

  async start() {
    if (this.job) {
      logger.warn('Notification job is already running');
      return;
    }

    logger.info('Starting notification job...');
    
    // Get all users with notification settings
    const { pool } = require('../config/db');
    let userIds = [];
    
    try {
      const usersResult = await pool.query('SELECT user_id FROM user_notification_settings');
      userIds = usersResult.rows.map(row => row.user_id);
      logger.info(`Found ${userIds.length} users with notification settings`);
    } catch (error) {
      logger.error('Error fetching users with notification settings:', error);
      return;
    }
    
    // Schedule the job to run daily at 9 AM
    this.job = cron.schedule(
      CRON_SCHEDULE,
      async () => {
        try {
          logger.info('Running license expiration check for all users...');
          // Process notifications for each user with their specific settings
          for (const userId of userIds) {
            try {
              logger.info(`Processing notifications for user ${userId}`);
              await processLicenseExpirations(7, false, userId);
              logger.info(`Completed processing for user ${userId}`);
            } catch (userError) {
              logger.error(`Error processing notifications for user ${userId}:`, userError);
            }
          }
          logger.info('License expiration check completed for all users');
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
        logger.info('Running initial license expiration check for all users...');
        for (const userId of userIds) {
          try {
            logger.info(`Processing initial notifications for user ${userId}`);
            await processLicenseExpirations(7, false, userId);
          } catch (userError) {
            logger.error(`Error in initial processing for user ${userId}:`, userError);
          }
        }
        logger.info('Initial license expiration check completed for all users');
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
