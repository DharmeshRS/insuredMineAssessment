const express = require('express');
const Policy = require('../models/Policy');
const User = require('../models/User');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

const router = express.Router();

// Search policy info by username
router.get('/search/by-username', async (req, res) => {
  try {
    const { username, firstName, lastName } = req.query;

    if (!username && (!firstName || !lastName)) {
      return res.status(400).json({
        success: false,
        error: 'Username or firstName and lastName are required'
      });
    }

    let userQuery = {};
    
    if (username) {
      // Search by username (could be email or first name + last name)
      userQuery = {
        $or: [
          { email: new RegExp(username, 'i') },
          { firstName: new RegExp(username, 'i') },
          { lastName: new RegExp(username, 'i') },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$firstName', ' ', '$lastName'] },
                regex: username,
                options: 'i'
              }
            }
          }
        ]
      };
    } else {
      // Search by first name and last name
      userQuery = {
        firstName: new RegExp(firstName, 'i'),
        lastName: new RegExp(lastName, 'i')
      };
    }

    // Find users matching the criteria
    const users = await User.find(userQuery).select('_id firstName lastName email');

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No users found matching the criteria'
      });
    }

    const userIds = users.map(user => user._id);

    // Find policies for these users
    const policies = await Policy.find({ userId: { $in: userIds } })
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('agentId', 'agentName email phone')
      .populate('policyCategoryId', 'categoryName categoryCode')
      .populate('companyCollectionId', 'companyName companyCode')
      .populate('accountId', 'accountName accountNumber')
      .sort({ createdAt: -1 });

    // Group policies by user
    const userPolicies = users.map(user => {
      const userPolicyData = policies.filter(policy => 
        policy.userId._id.toString() === user._id.toString()
      );

      return {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email
        },
        policies: userPolicyData,
        policyCount: userPolicyData.length,
        totalPremium: userPolicyData.reduce((sum, policy) => sum + policy.premiumAmount, 0),
        totalCoverage: userPolicyData.reduce((sum, policy) => sum + policy.coverageAmount, 0)
      };
    });

    res.status(200).json({
      success: true,
      data: userPolicies,
      totalUsers: users.length,
      totalPolicies: policies.length
    });

  } catch (error) {
    logger.error('Search policies by username error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get aggregated policy data by user
router.get('/aggregated/by-user', async (req, res) => {
  try {
    const { userId } = req.query;
    
    let matchStage = {};
    if (userId) {
      matchStage.userId = mongoose.Types.ObjectId(userId);
    }

    const aggregatedData = await Policy.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$userId',
          totalPolicies: { $sum: 1 },
          totalPremium: { $sum: '$premiumAmount' },
          totalCoverage: { $sum: '$coverageAmount' },
          totalDeductible: { $sum: '$deductible' },
          activePolicies: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          expiredPolicies: {
            $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
          },
          cancelledPolicies: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          averagePremium: { $avg: '$premiumAmount' },
          averageCoverage: { $avg: '$coverageAmount' },
          policies: { $push: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          user: {
            id: '$_id',
            firstName: '$userInfo.firstName',
            lastName: '$userInfo.lastName',
            email: '$userInfo.email',
            phoneNumber: '$userInfo.phoneNumber',
            userType: '$userInfo.userType'
          },
          summary: {
            totalPolicies: '$totalPolicies',
            activePolicies: '$activePolicies',
            expiredPolicies: '$expiredPolicies',
            cancelledPolicies: '$cancelledPolicies',
            totalPremium: { $round: ['$totalPremium', 2] },
            totalCoverage: { $round: ['$totalCoverage', 2] },
            totalDeductible: { $round: ['$totalDeductible', 2] },
            averagePremium: { $round: ['$averagePremium', 2] },
            averageCoverage: { $round: ['$averageCoverage', 2] }
          },
          policies: '$policies'
        }
      },
      { $sort: { 'summary.totalPremium': -1 } }
    ]);

    // If specific user requested, return only that user's data
    if (userId) {
      const userData = aggregatedData.find(item => 
        item.user.id.toString() === userId
      );
      
      if (!userData) {
        return res.status(404).json({
          success: false,
          error: 'No policies found for this user'
        });
      }

      return res.status(200).json({
        success: true,
        data: userData
      });
    }

    // Return all users' aggregated data
    res.status(200).json({
      success: true,
      data: aggregatedData,
      totalUsers: aggregatedData.length
    });

  } catch (error) {
    logger.error('Get aggregated policies error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


module.exports = router; 