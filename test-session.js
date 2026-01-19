#!/usr/bin/env node

/**
 * LinkedIn Session Tester
 * 
 * This script tests if your LinkedIn session is working
 * and checks for any blocking or detection issues.
 */

const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

puppeteerExtra.use(StealthPlugin());

const COOKIES_PATH = path.join(__dirname, 'linkedin-cookies.json');

async function testSession() {
  console.log('\n🧪 Testing LinkedIn Session...\n');
  console.log('='.repeat(60));
  
  let browser, page;
  
  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    const customUserDataDir = path.join(__dirname, '.chrome-user-data');
    const crashDumpsDir = path.join(__dirname, '.chrome-crashes');
    
    // Create crash dumps directory if it doesn't exist
    try {
      await fs.mkdir(crashDumpsDir, { recursive: true });
    } catch (e) {
      // Directory already exists
    }
    
    browser = await puppeteerExtra.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: customUserDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--start-maximized',
        '--disable-dev-shm-usage',
        '--disable-session-crashed-bubble',
        '--noerrdialogs',
        '--new-window'
      ],
      ignoreDefaultArgs: ['--enable-automation', '--disable-component-update'],
      defaultViewport: null
    });
    
    page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    console.log('✅ Browser launched');
    
    // Load cookies if they exist
    try {
      const cookiesString = await fs.readFile(COOKIES_PATH, 'utf-8');
      const cookies = JSON.parse(cookiesString);
      await page.setCookie(...cookies);
      console.log('🍪 Loaded saved cookies');
    } catch (error) {
      console.log('⚠️  No saved cookies found');
    }
    
    // Navigate to LinkedIn
    console.log('\n📡 Navigating to LinkedIn...');
    await page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check for errors
    const errors = await page.evaluate(() => {
      // Check console for errors
      const errorMessages = [];
      
      // Check for GraphQL errors
      const bodyText = document.body.innerText;
      if (bodyText.includes('GraphQL') || bodyText.includes('Invalid')) {
        errorMessages.push('GraphQL error detected in page content');
      }
      
      // Check if we're on the feed
      const isFeed = window.location.href.includes('/feed');
      const isLogin = window.location.href.includes('/login') || 
                     window.location.href.includes('/checkpoint');
      
      return {
        isFeed,
        isLogin,
        url: window.location.href,
        errors: errorMessages,
        hasGlobalNav: !!document.querySelector('.global-nav'),
        hasLoginForm: !!document.querySelector('#session_key, #username')
      };
    });
    
    console.log('\n📊 Test Results:');
    console.log('='.repeat(60));
    console.log(`Current URL: ${errors.url}`);
    console.log(`On Feed Page: ${errors.isFeed ? '✅ Yes' : '❌ No'}`);
    console.log(`On Login Page: ${errors.isLogin ? '⚠️  Yes (not logged in)' : '✅ No'}`);
    console.log(`Has Navigation: ${errors.hasGlobalNav ? '✅ Yes' : '❌ No'}`);
    console.log(`Has Login Form: ${errors.hasLoginForm ? '⚠️  Yes' : '✅ No'}`);
    
    if (errors.errors.length > 0) {
      console.log('\n❌ Errors Found:');
      errors.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('GraphQL') || text.includes('voyager')) {
          console.log(`\n🚨 GraphQL Error Detected: ${text.substring(0, 200)}`);
        }
      }
    });
    
    // Final verdict
    console.log('\n🎯 Verdict:');
    console.log('='.repeat(60));
    
    if (errors.isFeed && errors.hasGlobalNav && !errors.hasLoginForm) {
      console.log('✅ ✅ ✅ LinkedIn session is WORKING!');
      console.log('You can proceed with using the application.');
    } else if (errors.isLogin || errors.hasLoginForm) {
      console.log('⚠️  You are NOT logged in to LinkedIn.');
      console.log('Please login manually in the browser window.');
      console.log('\nSteps:');
      console.log('1. Log into LinkedIn in the browser that just opened');
      console.log('2. Complete any security challenges');
      console.log('3. Close the browser');
      console.log('4. Run this test again');
    } else if (errors.errors.length > 0) {
      console.log('❌ LinkedIn is detecting automation or blocking requests.');
      console.log('\nRecommendations:');
      console.log('1. Clear your session: rm linkedin-cookies.json');
      console.log('2. Wait 30 minutes before trying again');
      console.log('3. Consider using a different IP address');
      console.log('4. Review TROUBLESHOOTING.md for more help');
    } else {
      console.log('⚠️  Status unclear. Please check manually.');
    }
    
    console.log('\n💡 Browser will stay open for 30 seconds for you to inspect...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 Browser closed.');
    }
  }
  
  console.log('='.repeat(60));
  console.log('Test complete!\n');
}

// Run the test
testSession().catch(console.error);
