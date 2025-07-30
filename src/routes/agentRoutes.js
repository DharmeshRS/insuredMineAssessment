const express = require('express');
const Agent = require('../models/Agent');
const logger = require('../utils/logger');

const router = express.Router();

// Get all agents with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Add filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.department) filter.department = req.query.department;

    // Search by name or email
    if (req.query.search) {
      filter.$or = [
        { agentName: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') }
      ];
    }

    const agents = await Agent.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Agent.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: agents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    logger.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 