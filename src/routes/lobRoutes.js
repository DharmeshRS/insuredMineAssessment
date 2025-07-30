const express = require('express');
const LOB = require('../models/LOB');
const logger = require('../utils/logger');

const router = express.Router();

// Get all LOBs with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Add filters
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.riskLevel) filter.riskLevel = req.query.riskLevel;

    // Search by category name or code
    if (req.query.search) {
      filter.$or = [
        { categoryName: new RegExp(req.query.search, 'i') },
        { categoryCode: new RegExp(req.query.search, 'i') }
      ];
    }

    const lobs = await LOB.find(filter)
      .select('-__v')
      .sort({ categoryName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await LOB.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: lobs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Get LOBs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 