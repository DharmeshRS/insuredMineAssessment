const express = require('express');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Get all users with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Add filters
    if (req.query.userType) filter.userType = req.query.userType;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.state) filter['address.state'] = req.query.state;
    if (req.query.gender) filter.gender = req.query.gender;

    // Search by name or email
    if (req.query.search) {
      filter.$or = [
        { firstName: new RegExp(req.query.search, 'i') },
        { lastName: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') }
      ];
    }

    const users = await User.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 