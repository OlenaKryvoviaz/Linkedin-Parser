#!/usr/bin/env node

/**
 * LinkedIn Unblock Helper
 * 
 * This script helps you recover from LinkedIn blocks by:
 * 1. Clearing all session data
 * 2. Opening a fresh browser for manual login
 * 3. Saving the new session
 */

const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

puppeteerExtra.use(StealthPlugin());

const COOKIES_PATH = path.join(__dirname, 'linkedin-cookies.json');

async function unblockLinkedIn() {
  console.log('\n🔓 LinkedIn Unblock Helper\n');
  console.log('='.repeat(60));
  
  // Step 1: Clear old session
  console.log('\n📋 Step 1: Clearing blocked session...');
  try {
    await fs.unlink(COOKIES_PATH);
    console.log('✅ Deleted old cookies');
  } catch (error) {
    console.log('⚠️  No cookies to delete (already clean)');
  }
  
  console.log('\n📋 Step 2: Opening browser for manual login...');
  console.log('\n⚠️  IMPORTANT INSTRUCTIONS:');
  console.log('='.repeat(60));
  console.log('1. A browser window will open');
  console.log('2. LOG INTO LINKEDIN MANUALLY in that window');
  console.log('3. Complete ANY security challenges or CAPTCHAs');
  console.log('4. Navigate to your LinkedIn feed');
  console.log('5. Wait for the page to fully load');
  console.log('6. Press ENTER in this terminal when done');
  console.log('='.repeat(60));
  console.log('\n💡 TIP: If you see "Unusual activity" or CAPTCHA,');
  console.log('   complete it fully before pressing ENTER.\n');
  
  const browser = await puppeteerExtra.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--start-maximized'
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  
  // Navigate to LinkedIn login
  console.log('🌐 Navigating to LinkedIn...');
  await page.goto('https://www.linkedin.com/login', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  console.log('\n✅ Browser is ready!');
  console.log('👉 Please log in manually now...\n');
  
  // Wait for user to press ENTER
  await new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
  
  console.log('\n📋 Step 3: Verifying login...');
  
  // Check if logged in
  const currentUrl = page.url();
  const loginCheck = await page.evaluate(() => {
    const hasLoginForm = !!document.querySelector('#session_key, #username');
    const hasGlobalNav = !!document.querySelector('.global-nav');
    const isFeed = window.location.href.includes('/feed');
    
    return {
      hasLoginForm,
      hasGlobalNav,
      isFeed,
      url: window.location.href
    };
  });
  
  console.log('\nCurrent URL:', currentUrl);
  console.log('Has Navigation:', loginCheck.hasGlobalNav ? '✅' : '❌');
  console.log('On Feed:', loginCheck.isFeed ? '✅' : '❌');
  console.log('Login Form Present:', loginCheck.hasLoginForm ? '⚠️  Yes' : '✅ No');
  
  if (!loginCheck.hasGlobalNav && !loginCheck.isFeed) {
    console.log('\n⚠️  WARNING: You may not be logged in properly.');
    console.log('Please navigate to https://www.linkedin.com/feed/ and verify.');
    console.log('\nPress ENTER when you\'re on the feed page...\n');
    
    await new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        resolve();
      });
    });
  }
  
  console.log('\n📋 Step 4: Saving new session...');
  
  // Save cookies
  const cookies = await page.cookies();
  await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  
  console.log('✅ Session saved successfully!');
  console.log(`📁 Cookies saved to: ${COOKIES_PATH}`);
  console.log(`🍪 Number of cookies: ${cookies.length}`);
  
  console.log('\n📋 Step 5: Testing session...');
  
  // Test by navigating to feed
  await page.goto('https://www.linkedin.com/feed/', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const finalCheck = await page.evaluate(() => {
    const hasGlobalNav = !!document.querySelector('.global-nav');
    const hasLoginForm = !!document.querySelector('#session_key, #username');
    
    // Check for GraphQL errors
    const bodyText = document.body.innerText;
    const hasGraphQLError = bodyText.includes('GraphQL') || bodyText.includes('Invalid');
    
    return {
      hasGlobalNav,
      hasLoginForm,
      hasGraphQLError,
      url: window.location.href
    };
  });
  
  console.log('\n🎯 Final Verdict:');
  console.log('='.repeat(60));
  
  if (finalCheck.hasGlobalNav && !finalCheck.hasLoginForm && !finalCheck.hasGraphQLError) {
    console.log('✅ ✅ ✅ SUCCESS! LinkedIn session is working!');
    console.log('\nYou can now:');
    console.log('1. Close this browser');
    console.log('2. Run: npm start');
    console.log('3. Use the LinkedIn parser normally\n');
  } else if (finalCheck.hasGraphQLError) {
    console.log('❌ GraphQL errors detected - still blocked!');
    console.log('\nYour IP address is likely flagged. You need to:');
    console.log('1. Wait 30-60 minutes');
    console.log('2. Change your IP address (mobile hotspot, different WiFi)');
    console.log('3. Run this script again\n');
  } else {
    console.log('⚠️  Session status unclear.');
    console.log('Current URL:', finalCheck.url);
    console.log('Has Navigation:', finalCheck.hasGlobalNav ? 'Yes' : 'No');
    console.log('Has Login Form:', finalCheck.hasLoginForm ? 'Yes' : 'No');
    console.log('\nTry using the application and see if it works.\n');
  }
  
  console.log('Browser will close in 10 seconds...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  await browser.close();
  console.log('='.repeat(60));
  console.log('Done!\n');
}

// Run the unblock helper
unblockLinkedIn().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
