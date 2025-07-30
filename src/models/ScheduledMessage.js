const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  scheduledDay: {
    type: Date,
    required: [true, 'Scheduled day is required'],
    index: true
  },
  scheduledTime: {
    type: String,
    required: [true, 'Scheduled time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
    index: true
  },
  recipient: {
    type: String,
    trim: true
  },
  recipientType: {
    type: String,
    enum: ['email', 'sms', 'push', 'internal'],
    default: 'internal'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  retryCount: {
    type: Number,
    default: 0,
    max: [3, 'Maximum retry count is 3']
  },
  sentAt: {
    type: Date
  },
  errorMessage: {
    type: String,
    trim: true
  },
  metadata: {
    source: { type: String, trim: true },
    campaignId: { type: String, trim: true },
    tags: [{ type: String, trim: true }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to get full scheduled datetime
scheduledMessageSchema.virtual('scheduledDateTime').get(function() {
  if (!this.scheduledDay || !this.scheduledTime) return null;
  
  const date = new Date(this.scheduledDay);
  const [hours, minutes] = this.scheduledTime.split(':');
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  return date;
});

// Virtual to check if message is due
scheduledMessageSchema.virtual('isDue').get(function() {
  if (!this.scheduledDateTime) return false;
  return new Date() >= this.scheduledDateTime && this.status === 'pending';
});

// Pre-save middleware to validate scheduled date/time
scheduledMessageSchema.pre('save', function(next) {
  const scheduledDateTime = this.scheduledDateTime;
  
  if (scheduledDateTime && scheduledDateTime <= new Date() && this.isNew) {
    next(new Error('Scheduled date/time must be in the future'));
  } else {
    next();
  }
});

// Indexes for performance
scheduledMessageSchema.index({ scheduledDay: 1, scheduledTime: 1 });
scheduledMessageSchema.index({ status: 1, scheduledDay: 1 });
scheduledMessageSchema.index({ recipient: 1 });
scheduledMessageSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema); 