const cluster = require('cluster');
const os = require('os');
const pidusage = require('pidusage');
const app = require('./app');
const logger = require('./utils/logger');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3000;
const CPU_THRESHOLD = process.env.CPU_THRESHOLD || 70;
const RESTART_DELAY = process.env.RESTART_DELAY || 5000;

// Function to monitor CPU usage
const monitorCPU = () => {
  setInterval(async () => {
    try {
      const stats = await pidusage(process.pid);
      const cpuUsage = stats.cpu;
      
      logger.info(`CPU Usage: ${cpuUsage.toFixed(2)}%`);
      
      if (cpuUsage > CPU_THRESHOLD) {
        logger.warn(`CPU usage exceeded threshold (${CPU_THRESHOLD}%). Initiating restart...`);
        
        // Graceful shutdown
        setTimeout(() => {
          process.exit(1);
        }, RESTART_DELAY);
      }
    } catch (error) {
      logger.error('Error monitoring CPU:', error);
    }
  }, 10000); // Check every 10 seconds
};

// Cluster setup for production
if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  const numCPUs = os.cpus().length;
  
  logger.info(`Master ${process.pid} is running`);
  logger.info(`Forking ${numCPUs} workers`);
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    logger.info('Starting a new worker');
    cluster.fork();
  });
} else {
  // Worker process
  const startServer = async () => {
    try {
      // Connect to database
      await connectDB();
      
      // Start server
      const server = app.listen(PORT, () => {
        logger.info(`Worker ${process.pid} started on port ${PORT}`);
      });
      
      // Start CPU monitoring
      monitorCPU();
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          process.exit(0);
        });
      });
      
      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          process.exit(0);
        });
      });
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  };
  
  startServer();
} 