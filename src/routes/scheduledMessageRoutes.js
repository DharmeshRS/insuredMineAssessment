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

// Create a new scheduled message
router.post('/', async (req, res) => {
  try {
    const { message, day, time, recipient, recipientType, priority } = req.body;

    // Validation
    if (!message || !day || !time) {
      return res.status(400).json({
        success: false,
        error: 'Message, day, and time are required'
      });
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({
        success: false,
        error: 'Time must be in HH:MM format'
      });
    }

    // Validate date
    const scheduledDate = new Date(day);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    // Check if the scheduled date/time is in the future
    const now = new Date();
    const [hours, minutes] = time.split(':');
    const fullScheduledDate = new Date(scheduledDate);
    fullScheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (fullScheduledDate <= now) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled date and time must be in the future'
      });
    }

    // Create scheduled message
    const scheduledMessage = new ScheduledMessage({
      message,
      scheduledDay: scheduledDate,
      scheduledTime: time,
      recipient,
      recipientType: recipientType || 'internal',
      priority: priority || 'medium'
    });

    await scheduledMessage.save();

    // Schedule the message
    scheduleMessage(scheduledMessage);

    logger.info(`Scheduled message created: ${scheduledMessage._id}`);

    res.status(201).json({
      success: true,
      data: scheduledMessage,
      message: 'Message scheduled successfully'
    });

  } catch (error) {
    logger.error('Create scheduled message error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get all scheduled messages with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Add filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.recipientType) filter.recipientType = req.query.recipientType;

    const messages = await ScheduledMessage.find(filter)
      .sort({ scheduledDay: 1, scheduledTime: 1 })
      .skip(skip)
      .limit(limit);

    const total = await ScheduledMessage.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Get scheduled messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get pending messages (due to be sent)
router.get('/pending', async (req, res) => {
  try {
    const now = new Date();
    
    const pendingMessages = await ScheduledMessage.find({
      status: 'pending',
      scheduledDay: { $lte: now }
    }).sort({ scheduledDay: 1, scheduledTime: 1 });

    // Filter by time as well
    const dueMessages = pendingMessages.filter(msg => {
      const scheduledDateTime = msg.scheduledDateTime;
      return scheduledDateTime && scheduledDateTime <= now;
    });

    res.status(200).json({
      success: true,
      data: dueMessages,
      count: dueMessages.length
    });
  } catch (error) {
    logger.error('Get pending messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get message by ID
router.get('/:id', async (req, res) => {
  try {
    const message = await ScheduledMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled message not found'
      });
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Get scheduled message by ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update scheduled message
router.put('/:id', async (req, res) => {
  try {
    const message = await ScheduledMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled message not found'
      });
    }

    // If message is already sent, don't allow updates
    if (message.status === 'sent') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update a message that has already been sent'
      });
    }

    // Cancel existing cron job if it exists
    if (activeCronJobs.has(req.params.id)) {
      activeCronJobs.get(req.params.id).destroy();
      activeCronJobs.delete(req.params.id);
    }

    // Update the message
    const updatedMessage = await ScheduledMessage.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Reschedule if still pending and date/time changed
    if (updatedMessage.status === 'pending' && 
        (req.body.scheduledDay || req.body.scheduledTime)) {
      scheduleMessage(updatedMessage);
    }

    res.status(200).json({
      success: true,
      data: updatedMessage
    });
  } catch (error) {
    logger.error('Update scheduled message error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel scheduled message
router.delete('/:id', async (req, res) => {
  try {
    const message = await ScheduledMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled message not found'
      });
    }

    // Cancel cron job if it exists
    if (activeCronJobs.has(req.params.id)) {
      activeCronJobs.get(req.params.id).destroy();
      activeCronJobs.delete(req.params.id);
    }

    // Delete the message
    await ScheduledMessage.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Scheduled message cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel scheduled message error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Initialize scheduled messages on server start
const initializeScheduledMessages = async () => {
  try {
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