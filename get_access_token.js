/**
 * Script to get a valid Supabase access token for API testing
 * Run this script to get a proper Bearer token for your API calls
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

async function getAccessToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  console.log('🔐 Getting access token...\n');
  
  // Method 1: Sign in with email/password
  console.log('Method 1: Sign in with existing user');
  console.log('Enter your email and password when prompted, or use Method 2\n');
  
  const email = 'your-email@example.com'; // Replace with your email
  const password = 'your-password'; // Replace with your password
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
      console.log('\n📝 Alternative methods:');
      console.log('1. Update the email/password in this script');
      console.log('2. Use the browser method below');
      console.log('3. Create a new user account first\n');
      return;
    }
    
    if (data.session?.access_token) {
      console.log('✅ Success! Your access token is:');
      console.log(`Bearer ${data.session.access_token}`);
      console.log('\n📋 Copy this token and use it in your curl command:');
      console.log(`curl -X POST "http://localhost:3000/api/agents" \\`);
      console.log(`  -H "Content-Type: application/json" \\`);
      console.log(`  -H "Authorization: Bearer ${data.session.access_token}" \\`);
      console.log(`  -d '{"name": "Test Support Agent", "base_prompt": "You are a helpful customer support assistant", "model": "gpt-4o"}'`);
      console.log('\n⏰ Note: This token will expire. You may need to refresh it periodically.');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Method 2: Instructions for browser-based token extraction
console.log('🌐 Method 2: Get token from browser');
console.log('1. Open your app in the browser and sign in');
console.log('2. Open browser dev tools (F12)');
console.log('3. Go to Application/Storage tab');
console.log('4. Look for localStorage or sessionStorage');
console.log('5. Find the Supabase session data');
console.log('6. Copy the access_token value\n');

// Run the script
if (require.main === module) {
  getAccessToken();
}

module.exports = { getAccessToken };
