require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

// Import routes
const agentRoutes = require('./routes/agentRoutes');
const userRoutes = require('./routes/userRoutes');
const accountRoutes = require('./routes/accountRoutes');
const lobRoutes = require('./routes/lobRoutes');
const carrierRoutes = require('./routes/carrierRoutes');
const policyRoutes = require('./routes/policyRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const scheduledMessageRoutes = require('./routes/scheduledMessageRoutes');

const app = express();

// Trust proxy for rate limiting behind load balancer
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Logging middleware
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint with comprehensive system metrics
app.get('/health', async (req, res) => {
  try {
    const os = require('os');
    const pidusage = require('pidusage');
    
    // Get process stats
    const processStats = await pidusage(process.pid);
    
    // Get system memory info
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    // Get CPU info
    const cpuCount = os.cpus().length;
    const cpuModel = os.cpus()[0].model;
    const loadAverage = os.loadavg();
    
    // Get disk info (if available)
    const diskInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: os.uptime()
    };
    
    // Get network interfaces
    const networkInterfaces = os.networkInterfaces();
    const networkInfo = {};
    Object.keys(networkInterfaces).forEach(interface => {
      networkInterfaces[interface].forEach(details => {
        if (details.family === 'IPv4' && !details.internal) {
          networkInfo[interface] = details.address;
        }
      });
    });
    
    // Database connection status
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Memory usage in MB
    const memoryUsage = process.memoryUsage();
    
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      // CPU Information
      cpu: {
        usage: processStats.cpu.toFixed(2) + '%',
        threshold: process.env.CPU_THRESHOLD || 70
      },
      
      // Database Status
      database: {
        status: dbStatusText[dbStatus],
      },      
      // Process Information
      process: {
        pid: process.pid,
        memory: Math.round(processStats.memory / 1024 / 1024) + ' MB',
        cpu: processStats.cpu.toFixed(2) + '%',
        elapsed: processStats.elapsed + ' ms'
      }
    };
    
    // Check if system is healthy
    const cpuUsage = parseFloat(processStats.cpu);
    const memoryUsagePercentValue = parseFloat(memoryUsagePercent);
    const cpuThreshold = parseInt(process.env.CPU_THRESHOLD) || 70;
    const memoryThreshold = 90; // 90% memory usage threshold
    
    if (cpuUsage > cpuThreshold || memoryUsagePercentValue > memoryThreshold || dbStatus !== 1) {
      healthData.status = 'WARNING';
      healthData.warnings = [];
      
      if (cpuUsage > cpuThreshold) {
        healthData.warnings.push(`CPU usage (${cpuUsage.toFixed(2)}%) exceeds threshold (${cpuThreshold}%)`);
      }
      
      if (memoryUsagePercentValue > memoryThreshold) {
        healthData.warnings.push(`Memory usage (${memoryUsagePercentValue.toFixed(2)}%) exceeds threshold (${memoryThreshold}%)`);
      }
      
      if (dbStatus !== 1) {
        healthData.warnings.push(`Database is not connected (status: ${dbStatusText[dbStatus]})`);
      }
    }
    
    res.status(200).json(healthData);
    
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// API routes
app.use('/api/agents', agentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/lob', lobRoutes);
app.use('/api/carriers', carrierRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/scheduled-messages', scheduledMessageRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app; 