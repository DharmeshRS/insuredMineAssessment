const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters'],
    index: true
  },
  accountType: {
    type: String,
    enum: ['personal', 'business', 'corporate'],
    required: [true, 'Account type is required'],
    default: 'personal'
  },
  accountNumber: {
    type: String,
    unique: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'closed'],
    default: 'active'
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate account number before saving
accountSchema.pre('save', function(next) {
  if (!this.accountNumber && this.isNew) {
    this.accountNumber = `ACC${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Indexes for performance (accountName, accountNumber, and userId already have index: true)
accountSchema.index({ status: 1 });
accountSchema.index({ accountType: 1 });

module.exports = mongoose.model('Account', accountSchema); 