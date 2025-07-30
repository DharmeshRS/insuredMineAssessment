const express = require('express');
const cron = require('node-cron');
const ScheduledMessage = require('../models/ScheduledMessage');
const logger = require('../utils/logger');

const router = express.Router();

// Store active cron jobs
const activeCronJobs = new Map();

// Helper function to schedule a message
const scheduleMessage = (message) => {
  try {
    const { scheduledDay, scheduledTime, _id } = message;
    const [hours, minutes] = scheduledTime.split(':');
    
    // Create cron expression for specific date and time
    const scheduleDate = new Date(scheduledDay);
    const cronTime = `${minutes} ${hours} ${scheduleDate.getDate()} ${scheduleDate.getMonth() + 1} *`;
    
    logger.info(`Scheduling message ${_id} for ${cronTime}`);
    
    const task = cron.schedule(cronTime, async () => {
      try {
        // Update message status to sent
        await ScheduledMessage.findByIdAndUpdate(_id, {
          status: 'sent',
          sentAt: new Date()
        });
        
        logger.info(`Message ${_id} sent successfully: ${message.message}`);
        
        // TODO: Implement actual message sending logic here
        // This could be email, SMS, push notification, etc.
        
        // Remove from active jobs
        if (activeCronJobs.has(_id.toString())) {
          activeCronJobs.get(_id.toString()).destroy();
          activeCronJobs.delete(_id.toString());
        }
        
      } catch (error) {
        logger.error(`Failed to send message ${_id}:`, error);
        
        // Update message status to failed and increment retry count
        await ScheduledMessage.findByIdAndUpdate(_id, {
          $inc: { retryCount: 1 },
          errorMessage: error.message,
          status: 'failed'
        });
      }
    }, {
      scheduled: false,
      timezone: "America/New_York"
    });
    
    activeCronJobs.set(_id.toString(), task);
    task.start();
    
  } catch (error) {
    logger.error('Error scheduling message:', error);
    throw error;
  }
};

// Initialize scheduled messages on server start
const initializeScheduledMessages = async () => {
  try {
    // Wait for database connection to be ready
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      logger.info('Waiting for database connection before initializing scheduled messages...');
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }

    const pendingMessages = await ScheduledMessage.find({
      status: 'pending',
      scheduledDay: { $gte: new Date() }
    });

    for (const message of pendingMessages) {
      scheduleMessage(message);
    }

    logger.info(`Initialized ${pendingMessages.length} scheduled messages`);
  } catch (error) {
    logger.error('Failed to initialize scheduled messages:', error);
  }
};

// Call initialization when the module loads
initializeScheduledMessages();

module.exports = router; 