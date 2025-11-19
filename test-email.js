// Test script for email endpoint
// Run with: node test-email.js

async function testEmail() {
  try {
    const response = await fetch('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        message: 'This is a test message from the test script',
      }),
    });

    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('Response data:', data);

    if (response.ok) {
      console.log('✅ Email sent successfully!');
      if (data.emailId) {
        console.log('Email ID:', data.emailId);
      }
    } else {
      console.log('❌ Failed to send email');
      console.log('Error:', data.error);
      if (data.details) {
        console.log('Details:', data.details);
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

console.log('Testing email endpoint...');
console.log('Make sure the development server is running on http://localhost:3000');
console.log('---');

testEmail();