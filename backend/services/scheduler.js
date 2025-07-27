const cron = require('node-cron');
const { processLicenseExpirations } = require('./emailService');
const logger = require('../utils/logger');
const { pool } = require('../config/db');

// Store active tasks
const activeTasks = new Map();

// Function to get all users with email notifications enabled
async function getUsersWithEmailNotifications() {
  try {
    const result = await pool.query(
      `SELECT 
         u.id, 
         COALESCE(uns.email_address, u.email) as email, 
         uns.notification_time, 
         uns.days_before_expiration, 
         uns.include_inactive,
         uns.email_address as notification_email
       FROM users u
       JOIN user_notification_settings uns ON u.id = uns.user_id
       WHERE uns.send_to_email = true`
    );
    logger.debug('Fetched users with email notifications:', result.rows);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching users with email notifications:', error);
    return [];
  }
}

// Function to schedule notifications for a specific user
function scheduleUserNotifications(user) {
  try {
    // Cancel any existing task for this user
    if (activeTasks.has(user.id)) {
      const existingTask = activeTasks.get(user.id);
      existingTask.stop();
      activeTasks.delete(user.id);
    }

    // Parse the notification time (format: 'HH:MM')
    const [hours, minutes] = user.notification_time.split(':');
    
    // Schedule the task to run daily at the specified time
    const task = cron.schedule(
      `${minutes} ${hours} * * *`, // Run at the specified time every day
      async () => {
        try {
          logger.info(`Running scheduled notifications for user ${user.id} at ${user.notification_time}`, {
            daysBeforeExpiration: user.days_before_expiration,
            includeInactive: user.include_inactive,
            userId: user.id
          });
          
          // Ensure parameters are passed in the correct order:
          // 1. daysAhead
          // 2. includeInactive
          // 3. userId (optional)
          await processLicenseExpirations(
            user.days_before_expiration, 
            user.include_inactive, 
            user.id
          );
        } catch (error) {
          logger.error(`Error in scheduled task for user ${user.id}:`, error);
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Bangkok'
      }
    );
    
    // Store the task
    activeTasks.set(user.id, task);
    
    logger.info(`Scheduled notifications for user ${user.id} at ${user.notification_time} (Bangkok time)`);
    return task;
  } catch (error) {
    logger.error(`Error scheduling notifications for user ${user.id}:`, error);
    return null;
  }
}

// Update notification schedule for a specific user
async function updateUserSchedule(userId) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, uns.notification_time, uns.days_before_expiration, uns.include_inactive
       FROM users u
       JOIN user_notification_settings uns ON u.id = uns.user_id
       WHERE u.id = $1 AND uns.send_to_email = true`,
      [userId]
    );
    
    if (result.rows.length > 0) {
      await scheduleUserNotifications(result.rows[0]);
      logger.info(`Updated schedule for user ${userId}`);
    } else {
      // If user doesn't have notifications enabled, cancel any existing task
      if (activeTasks.has(userId)) {
        activeTasks.get(userId).stop();
        activeTasks.delete(userId);
        logger.info(`Cancelled notifications for user ${userId} (notifications disabled)`);
      }
    }
  } catch (error) {
    logger.error(`Error updating schedule for user ${userId}:`, error);
  }
}

// Initialize the scheduler
async function initScheduler() {
  try {
    // Clear any existing tasks
    activeTasks.forEach(task => task.stop());
    activeTasks.clear();
    
    // Get all users with email notifications enabled
    const users = await getUsersWithEmailNotifications();
    
    // Schedule notifications for each user
    users.forEach(user => scheduleUserNotifications(user));
    
    logger.info(`Initialized ${users.length} scheduled notification tasks`);
    return Array.from(activeTasks.values());
  } catch (error) {
    logger.error('Error initializing scheduler:', error);
    return [];
  }
}

module.exports = {
  initScheduler,
  getUsersWithEmailNotifications,
  scheduleUserNotifications,
  updateUserSchedule
};
