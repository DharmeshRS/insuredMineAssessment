const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  agentName: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true,
    maxlength: [100, 'Agent name cannot exceed 100 characters'],
    index: true
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  department: {
    type: String,
    trim: true
  },
  hireDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance (fields with index: true are automatically indexed)
agentSchema.index({ status: 1 });

module.exports = mongoose.model('Agent', agentSchema); 