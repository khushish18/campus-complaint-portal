const jwt = require('jsonwebtoken');

const login = async (email, password) => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    console.log(`LOGIN SUCCESS FOR ${email}:`);
    console.log('Response keys:', Object.keys(data));
    console.log('User Role:', data.user.role);
    const token = data.token;
    const decoded = jwt.decode(token);
    console.log('Decoded Token Payload:', decoded);
  } catch (error) {
    console.error(`LOGIN FAILED FOR ${email}:`, error.message);
  }
};

const run = async () => {
  await login('student@campus.edu', 'password123');
  console.log('-----------------------------');
  await login('warden@campus.edu', 'password123');
};

run();
