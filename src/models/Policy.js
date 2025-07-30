const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  policyNumber: {
    type: String,
    required: [true, 'Policy number is required'],
    unique: true,
    trim: true,
    index: true
  },
  policyStartDate: {
    type: Date,
    required: [true, 'Policy start date is required'],
    index: true
  },
  policyEndDate: {
    type: Date,
    required: [true, 'Policy end date is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  policyCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LOB',
    required: [true, 'Policy category ID is required'],
    index: true
  },
  companyCollectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Carrier',
    required: [true, 'Company collection ID is required'],
    index: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    index: true
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    index: true
  },
  premiumAmount: {
    type: Number,
    required: [true, 'Premium amount is required'],
    min: [0, 'Premium amount cannot be negative']
  },
  coverageAmount: {
    type: Number,
    required: [true, 'Coverage amount is required'],
    min: [0, 'Coverage amount cannot be negative']
  },
  deductible: {
    type: Number,
    default: 0,
    min: [0, 'Deductible cannot be negative']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'cancelled', 'pending'],
    default: 'pending',
    index: true
  },
  paymentFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi-annually', 'annually'],
    default: 'monthly'
  },
  renewalDate: {
    type: Date,
    index: true
  },
  beneficiaries: [{
    name: { type: String, required: true, trim: true },
    relationship: { type: String, required: true, trim: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    contactInfo: {
      phone: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true }
    }
  }],
  claims: [{
    claimNumber: { type: String, unique: true, sparse: true },
    claimDate: { type: Date, default: Date.now },
    claimAmount: { type: Number, min: 0 },
    status: { type: String, enum: ['submitted', 'processing', 'approved', 'denied'], default: 'submitted' },
    description: { type: String, trim: true }
  }],
  documents: [{
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    uploadDate: { type: Date, default: Date.now }
  }],
  notes: [{
    content: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to check if policy is active
policySchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.policyStartDate <= now && 
         this.policyEndDate >= now;
});

// Virtual to calculate days until expiry
policySchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const expiry = new Date(this.policyEndDate);
  const diffTime = expiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to auto-generate policy number
policySchema.pre('save', function(next) {
  if (!this.policyNumber && this.isNew) {
    this.policyNumber = `POL${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
  
  // Set renewal date if not provided
  if (!this.renewalDate && this.policyEndDate) {
    this.renewalDate = new Date(this.policyEndDate);
  }
  
  next();
});

// Validate policy dates
policySchema.pre('save', function(next) {
  if (this.policyStartDate >= this.policyEndDate) {
    next(new Error('Policy start date must be before end date'));
  } else {
    next();
  }
});

// Compound indexes for performance (renewalDate already has index: true)
policySchema.index({ userId: 1, status: 1 });
policySchema.index({ policyStartDate: 1, policyEndDate: 1 });
policySchema.index({ policyCategoryId: 1, status: 1 });
policySchema.index({ companyCollectionId: 1, status: 1 });
policySchema.index({ agentId: 1, status: 1 });

module.exports = mongoose.model('Policy', policySchema); 