require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

console.log(`
🚀 ===============================
   ZAMMER SERVER INITIALIZATION
===============================
🌍 Environment: ${NODE_ENV}
📡 Port: ${PORT}
🌐 Frontend URL: ${FRONTEND_URL}
🔥 Starting server components...
===============================`);

// Define server variable in the global scope
let httpServer;

try {
  // Load app module
  console.log('Loading app module...');
  const { app, server } = require('./app');
  console.log('✅ App module loaded successfully');

  // Create HTTP server
  httpServer = http.createServer(app);

  // 🎯 PRODUCTION: Get allowed origins for Socket.IO
  const getAllowedOrigins = () => {
    const origins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost:3000'
    ];
    
    // Add production frontend URL
    if (FRONTEND_URL && FRONTEND_URL !== 'http://localhost:3000') {
      origins.push(FRONTEND_URL);
    }
    
    // Add Amplify and CloudFront domains
    origins.push(
      /https:\/\/.*\.amplifyapp\.com$/,
      /https:\/\/.*\.cloudfront\.net$/
    );
    
    return origins;
  };

  // Setup Socket.IO with enhanced CORS configuration
  const io = socketIo(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    // Add connection state recovery for production
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    }
  });

  // Basic Socket.IO connection handling (main logic is in app.js)
  io.on('connection', (socket) => {
    console.log(`🔌 Socket.IO connection established: ${socket.id}`);
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket.IO disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  // Make io available globally for use in routes
  global.io = io;

  console.log(`
✅ ===============================
   SOCKET.IO CONFIGURATION
===============================
🔗 Transport: WebSocket + Polling
🛡️ CORS Origins: ${getAllowedOrigins().length} configured
⚡ Real-time Features: ACTIVE
🔄 State Recovery: ENABLED
===============================`);

  // 🎯 PRODUCTION: Enhanced server startup
  const startServer = () => {
    return new Promise((resolve, reject) => {
      httpServer.listen(PORT, '0.0.0.0', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  };

  // Start server with error handling
  startServer()
    .then(() => {
      console.log(`
🎉 ===============================
   ZAMMER SERVER READY!
===============================
🌐 HTTP Server: http://localhost:${PORT}
📡 Socket Server: ws://localhost:${PORT}
🛒 API Endpoints: http://localhost:${PORT}/api
💚 Health Check: http://localhost:${PORT}/api/health
🔔 Real-time: OPERATIONAL
🚀 Environment: ${NODE_ENV}
===============================`);
      
      // Connect to MongoDB
      connectDB();

      // 🎯 PRODUCTION: Additional startup checks
      if (NODE_ENV === 'production') {
        console.log(`
🔒 ===============================
   PRODUCTION SECURITY ACTIVE
===============================
🛡️ Helmet: ENABLED
⚡ Rate Limiting: ACTIVE
🔐 CORS: RESTRICTED
📊 Monitoring: READY
===============================`);
      }
    })
    .catch((error) => {
      console.error('❌ FAILED TO START SERVER:');
      console.error(error);
      process.exit(1);
    });

} catch (error) {
  console.error('❌ CRITICAL ERROR DURING SERVER STARTUP:');
  console.error('Error details:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

// 🎯 PRODUCTION: Enhanced error handling
process.on('unhandledRejection', (err, promise) => {
  console.log('💥 UNHANDLED REJECTION! Shutting down...');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  
  if (NODE_ENV === 'development') {
    console.error('Error stack:', err.stack);
    console.error('Promise:', promise);
  }
  
  // Close server & exit process
  if (httpServer) {
    httpServer.close(() => {
      console.log('🛑 Server closed due to unhandled rejection');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.log('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  
  if (NODE_ENV === 'development') {
    console.error('Error stack:', err.stack);
  }
  
  // Close server & exit process
  if (httpServer) {
    httpServer.close(() => {
      console.log('🛑 Server closed due to uncaught exception');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// 🎯 PRODUCTION: Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  if (httpServer) {
    httpServer.close(() => {
      console.log('✅ HTTP server closed gracefully');
      
      // Give time for cleanup
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.log('⚠️ Forcing server shutdown...');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  if (httpServer) {
    httpServer.close(() => {
      console.log('✅ HTTP server closed gracefully');
      process.exit(0);
    });
    
    // Force close after 5 seconds
    setTimeout(() => {
      console.log('⚠️ Forcing server shutdown...');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
});

// 🎯 PRODUCTION: Memory usage monitoring
if (NODE_ENV === 'production') {
  setInterval(() => {
    const used = process.memoryUsage();
    const memoryUsage = {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(used.external / 1024 / 1024 * 100) / 100
    };
    
    // Log if memory usage is high
    if (memoryUsage.heapUsed > 500) { // More than 500MB
      console.log(`⚠️ High memory usage detected: ${JSON.stringify(memoryUsage)} MB`);
    }
  }, 30000); // Check every 30 seconds
}

// Export for testing purposes
module.exports = { httpServer };