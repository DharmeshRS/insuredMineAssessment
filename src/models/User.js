const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { 
      type: String, 
      required: [true, 'State is required'],
      trim: true 
    },
    zipCode: { 
      type: String, 
      required: [true, 'Zip code is required'],
      trim: true,
      match: [/^\d{5}(-\d{4})?$/, 'Please enter a valid zip code']
    },
    country: { type: String, default: 'USA', trim: true }
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  userType: {
    type: String,
    enum: ['individual', 'business', 'family', 'active_client', 'client'],
    required: [true, 'User type is required'],
    default: 'individual'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Indexes for performance (email already has index: true)
userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ 'address.state': 1 });
userSchema.index({ 'address.zipCode': 1 });
userSchema.index({ userType: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema); 