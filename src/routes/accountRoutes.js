const express = require('express');
const Account = require('../models/Account');
const logger = require('../utils/logger');

const router = express.Router();

// Get all accounts with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Add filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.accountType) filter.accountType = req.query.accountType;
    if (req.query.userId) filter.userId = req.query.userId;

    // Search by account name or number
    if (req.query.search) {
      filter.$or = [
        { accountName: new RegExp(req.query.search, 'i') },
        { accountNumber: new RegExp(req.query.search, 'i') }
      ];
    }

    const accounts = await Account.find(filter)
      .populate('userId', 'firstName lastName email')
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Account.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: accounts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 