const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generateInsights, getSummaryStats, chat } = require('../controllers/aiController');

// All routes require authentication
router.use(authenticateToken);

// Generate AI insights
router.post('/insights', generateInsights);

// Get summary statistics (without AI)
router.post('/summary', getSummaryStats);

// Chat with AI about data
router.post('/chat', chat);

module.exports = router;
