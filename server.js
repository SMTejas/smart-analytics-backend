const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Server is running!',
    status: 'success',
    database: 'MongoDB Connected',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile'
      },
      upload: {
        upload: 'POST /api/upload/upload',
        files: 'GET /api/upload/files',
        fileData: 'GET /api/upload/files/:id'
      },
      ai: {
        insights: 'POST /api/ai/insights',
        summary: 'POST /api/ai/summary'
      }
    }
  });
});

// Test upload directory
app.get('/test-upload', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, 'uploads');
  
  res.json({
    uploadsDir: uploadsDir,
    exists: fs.existsSync(uploadsDir),
    files: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);

// Connect to database
connectDB();

// Start server
app.listen(PORT, () => {
  console.log('🚀 ===========================================');
  console.log('✅ Server is running on port', PORT);
  console.log('✅ MongoDB connection established');
  console.log('🌐 API available at: http://localhost:' + PORT);
  console.log('🔐 Auth endpoints:');
  console.log('   POST /api/auth/register');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/auth/profile');
  console.log('📁 Upload endpoints:');
  console.log('   POST /api/upload/upload');
  console.log('   GET  /api/upload/files');
  console.log('   GET  /api/upload/files/:fileId');
  console.log('   DELETE /api/upload/files/:fileId');
  console.log('🤖 AI endpoints:');
  console.log('   POST /api/ai/insights');
  console.log('   POST /api/ai/summary');
  console.log('🚀 ===========================================');
});
