const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
const logger = require('../utils/logger');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only XLSX, XLS, and CSV files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { sheetType } = req.body;
    
    if (!sheetType) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Sheet type is required (agent, user, account, lob, carrier, policy, consolidated)'
      });
    }

    const validSheetTypes = ['agent', 'user', 'account', 'lob', 'carrier', 'policy', 'consolidated'];
    if (!validSheetTypes.includes(sheetType.toLowerCase())) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Invalid sheet type. Must be one of: ' + validSheetTypes.join(', ')
      });
    }

    logger.info(`File upload started: ${req.file.originalname}, Type: ${sheetType}`);

    // Process file using worker thread
    const worker = new Worker(path.join(__dirname, '../workers/fileProcessor.js'), {
      workerData: {
        filePath: req.file.path,
        sheetType: sheetType.toLowerCase(),
        mongoUri: process.env.MONGODB_URI
      }
    });

    // Handle worker messages
    worker.on('message', (result) => {
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error('Failed to cleanup uploaded file:', cleanupError);
      }

      if (result.success) {
        logger.info(`File processing completed: ${JSON.stringify(result.results)}`);
        res.status(200).json({
          success: true,
          message: 'File processed successfully',
          data: result.results
        });
      } else {
        logger.error(`File processing failed: ${result.error}`);
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    });

    // Handle worker errors
    worker.on('error', (error) => {
      logger.error('Worker error:', error);
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error('Failed to cleanup uploaded file:', cleanupError);
      }

      res.status(500).json({
        success: false,
        error: 'File processing failed: ' + error.message
      });
    });

    // Handle worker exit
    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.error(`Worker stopped with exit code ${code}`);
      }
    });

  } catch (error) {
    logger.error('Upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get upload status/history (optional feature)
router.get('/status', async (req, res) => {
  try {
    // This could be extended to track upload history in database
    res.status(200).json({
      success: true,
      message: 'Upload service is running',
      supportedTypes: ['xlsx', 'xls', 'csv'],
      maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
      sheetTypes: ['agent', 'user', 'account', 'lob', 'carrier', 'policy', 'consolidated']
    });
  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 