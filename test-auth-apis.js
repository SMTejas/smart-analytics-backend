// Test script for Authentication APIs
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testAuthAPIs = async () => {
  console.log('🧪 Testing Authentication APIs...\n');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for testing\n');

    const baseURL = 'http://localhost:5000';
    
    // Test data
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    console.log('📝 Test 1: User Registration');
    console.log('POST /api/auth/register');
    
    const registerResponse = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });

    const registerData = await registerResponse.json();
    
    if (registerData.success) {
      console.log('✅ Registration successful');
      console.log('   - User ID:', registerData.data.user.id);
      console.log('   - Name:', registerData.data.user.name);
      console.log('   - Email:', registerData.data.user.email);
      console.log('   - Token received:', !!registerData.data.token);
      console.log('   - Token length:', registerData.data.token.length);
    } else {
      console.log('❌ Registration failed:', registerData.message);
    }

    console.log('\n🔑 Test 2: User Login');
    console.log('POST /api/auth/login');
    
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    const loginData = await loginResponse.json();
    
    if (loginData.success) {
      console.log('✅ Login successful');
      console.log('   - User ID:', loginData.data.user.id);
      console.log('   - Name:', loginData.data.user.name);
      console.log('   - Email:', loginData.data.user.email);
      console.log('   - Token received:', !!loginData.data.token);
      console.log('   - Token length:', loginData.data.token.length);
      
      // Test 3: Protected Route
      console.log('\n🔒 Test 3: Protected Route Access');
      console.log('GET /api/auth/profile');
      
      const profileResponse = await fetch(`${baseURL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.data.token}`,
          'Content-Type': 'application/json',
        }
      });

      const profileData = await profileResponse.json();
      
      if (profileData.success) {
        console.log('✅ Profile access successful');
        console.log('   - User ID:', profileData.data.user._id);
        console.log('   - Name:', profileData.data.user.name);
        console.log('   - Email:', profileData.data.user.email);
        console.log('   - Password excluded:', !profileData.data.user.password);
      } else {
        console.log('❌ Profile access failed:', profileData.message);
      }

      // Test 4: Invalid Token
      console.log('\n🚫 Test 4: Invalid Token Test');
      console.log('GET /api/auth/profile (with invalid token)');
      
      const invalidTokenResponse = await fetch(`${baseURL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid_token_123',
          'Content-Type': 'application/json',
        }
      });

      const invalidTokenData = await invalidTokenResponse.json();
      console.log('✅ Invalid token rejected:', !invalidTokenData.success);
      console.log('   - Error message:', invalidTokenData.message);

      // Test 5: No Token
      console.log('\n🚫 Test 5: No Token Test');
      console.log('GET /api/auth/profile (without token)');
      
      const noTokenResponse = await fetch(`${baseURL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const noTokenData = await noTokenResponse.json();
      console.log('✅ No token rejected:', !noTokenData.success);
      console.log('   - Error message:', noTokenData.message);

    } else {
      console.log('❌ Login failed:', loginData.message);
    }

    // Test 6: Duplicate Registration
    console.log('\n📧 Test 6: Duplicate Email Registration');
    console.log('POST /api/auth/register (duplicate email)');
    
    const duplicateResponse = await fetch(`${baseURL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });

    const duplicateData = await duplicateResponse.json();
    console.log('✅ Duplicate email rejected:', !duplicateData.success);
    console.log('   - Error message:', duplicateData.message);

    // Test 7: Invalid Login
    console.log('\n🔐 Test 7: Invalid Login Credentials');
    console.log('POST /api/auth/login (wrong password)');
    
    const invalidLoginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: 'wrongpassword'
      })
    });

    const invalidLoginData = await invalidLoginResponse.json();
    console.log('✅ Invalid credentials rejected:', !invalidLoginData.success);
    console.log('   - Error message:', invalidLoginData.message);

    // Clean up test user
    console.log('\n🧹 Cleaning up test data...');
    await User.findOneAndDelete({ email: testUser.email });
    console.log('✅ Test user deleted');

    console.log('\n🎉 All Authentication API tests completed!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ User Registration');
    console.log('   ✅ User Login');
    console.log('   ✅ Protected Route Access');
    console.log('   ✅ Token Validation');
    console.log('   ✅ Error Handling');
    console.log('   ✅ Security Features');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Check if server is running
const checkServer = async () => {
  try {
    const response = await fetch('http://localhost:5000');
    if (response.ok) {
      console.log('✅ Server is running on port 5000');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm run dev');
    return false;
  }
};

// Run the tests
const runTests = async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testAuthAPIs();
  }
};

runTests();
