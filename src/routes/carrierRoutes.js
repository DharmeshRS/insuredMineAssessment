const express = require('express');
const Carrier = require('../models/Carrier');
const logger = require('../utils/logger');

const router = express.Router();

// Get all carriers with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Add filters
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    // Search by company name, code, or license number
    if (req.query.search) {
      filter.$or = [
        { companyName: new RegExp(req.query.search, 'i') },
        { companyCode: new RegExp(req.query.search, 'i') },
        { licenseNumber: new RegExp(req.query.search, 'i') }
      ];
    }

    const carriers = await Carrier.find(filter)
      .select('-__v')
      .sort({ companyName: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Carrier.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: carriers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Get carriers error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 