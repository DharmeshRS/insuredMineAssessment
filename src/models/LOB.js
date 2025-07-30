const mongoose = require('mongoose');

const lobSchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    index: true
  },
  categoryCode: {
    type: String,
    required: [true, 'Category code is required'],
    trim: true,
    unique: true,
    uppercase: true,
    maxlength: [10, 'Category code cannot exceed 10 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  basePremiumRate: {
    type: Number,
    required: [true, 'Base premium rate is required'],
    min: [0, 'Premium rate cannot be negative']
  },
  coverageTypes: [{
    type: String,
    trim: true
  }],
  regulations: {
    minCoverage: { type: Number, default: 0 },
    maxCoverage: { type: Number },
    requiredDocuments: [{ type: String, trim: true }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance (categoryName and categoryCode already have index: true)
lobSchema.index({ isActive: 1 });
lobSchema.index({ riskLevel: 1 });

module.exports = mongoose.model('LOB', lobSchema); 