const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testAuth() {
    try {
        console.log('🧪 Testing Authentication Endpoints\n');

        // Test 1: Register a new user
        console.log('1️⃣ Testing Registration...');
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
            email: 'test@example.com',
            password: 'Test123!@#',
            name: 'Test User',
            skills: ['JavaScript', 'TypeScript', 'React']
        });
        console.log('✅ Registration successful!');
        console.log('User:', registerResponse.data.user);
        console.log('Token:', registerResponse.data.access_token.substring(0, 20) + '...\n');

        const token = registerResponse.data.access_token;

        // Test 2: Login with the same user
        console.log('2️⃣ Testing Login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test@example.com',
            password: 'Test123!@#'
        });
        console.log('✅ Login successful!');
        console.log('User:', loginResponse.data.user);
        console.log('Token:', loginResponse.data.access_token.substring(0, 20) + '...\n');

        // Test 3: Get profile with JWT token
        console.log('3️⃣ Testing Profile Endpoint...');
        const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log('✅ Profile retrieved successfully!');
        console.log('Profile:', profileResponse.data);
        console.log('\n🎉 All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

testAuth();
