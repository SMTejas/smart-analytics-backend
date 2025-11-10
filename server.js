const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

/* ----------------------------------------
   SECURITY + BASIC MIDDLEWARE
---------------------------------------- */
app.use(helmet());

// CORS for frontend (Vercel)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Prevent brute force
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
  })
);

// Trust reverse proxy (Render)
app.set('trust proxy', 1);

/* ----------------------------------------
   HEALTH CHECK (Render uses this)
---------------------------------------- */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

/* ----------------------------------------
   ROOT ROUTE
---------------------------------------- */
app.get('/', (req, res) => {
  res.json({
    message: 'Backend API running successfully',
    status: 'success',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    useful_routes: {
      health: '/health',
      auth: '/api/auth/*',
      upload: '/api/upload/*',
      ai: '/api/ai/*',
    },
  });
});

/* ----------------------------------------
   API ROUTES
---------------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);

/* ----------------------------------------
   CONNECT DB THEN START SERVER
---------------------------------------- */
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log('============================================');
      console.log(`✅ Backend running on port ${PORT}`);
      console.log('✅ MongoDB connected');
      console.log(`🌐 Render URL: ${process.env.RENDER_EXTERNAL_URL || 'LOCAL'}`);
      console.log('============================================');
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB', err);
    process.exit(1);
  });
