const mongoose = require('mongoose');

const carrierSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    index: true
  },
  companyCode: {
    type: String,
    required: [true, 'Company code is required'],
    trim: true,
    unique: true,
    uppercase: true,
    maxlength: [10, 'Company code cannot exceed 10 characters']
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    trim: true,
    unique: true
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'USA', trim: true }
  },
  contactInfo: {
    phone: { 
      type: String, 
      required: [true, 'Phone number is required'],
      trim: true 
    },
    email: { 
      type: String, 
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    website: { type: String, trim: true },
    fax: { type: String, trim: true }
  },
  financialRating: {
    agency: { type: String, trim: true },
    rating: { type: String, trim: true },
    lastUpdated: { type: Date, default: Date.now }
  },
  specialties: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  establishedDate: {
    type: Date
  },
  marketShare: {
    type: Number,
    min: [0, 'Market share cannot be negative'],
    max: [100, 'Market share cannot exceed 100%']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance (companyName, companyCode, and licenseNumber already have index: true)
carrierSchema.index({ isActive: 1 });
carrierSchema.index({ 'contactInfo.email': 1 });

module.exports = mongoose.model('Carrier', carrierSchema); 