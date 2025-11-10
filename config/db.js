const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Validate MONGODB_URI exists and has correct format
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI environment variable is not set!');
      console.error('Please set MONGODB_URI in your environment variables.');
      process.exit(1);
    }

    // Trim whitespace and validate format
    const trimmedUri = mongoUri.trim();
    if (!trimmedUri.startsWith('mongodb://') && !trimmedUri.startsWith('mongodb+srv://')) {
      console.error('❌ Invalid MONGODB_URI format!');
      console.error('Connection string must start with "mongodb://" or "mongodb+srv://"');
      console.error('Current value (first 20 chars):', trimmedUri.substring(0, 20) + '...');
      process.exit(1);
    }

    const conn = await mongoose.connect(trimmedUri);

    console.log('🔗 ===========================================');
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`🗄️  Database: ${conn.connection.name}`);
    console.log('🔗 ===========================================');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
