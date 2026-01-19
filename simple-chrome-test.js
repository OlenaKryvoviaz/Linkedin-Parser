#!/usr/bin/env node

/**
 * Simple Chrome Test - Tests if Chrome can launch
 * Run this directly: node simple-chrome-test.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function testChrome() {
  console.log('\n🧪 Simple Chrome Launch Test\n');
  console.log('Testing if Chrome can launch with current permissions...\n');
  
  const userDataDir = path.join(__dirname, '.chrome-test-data');
  
  try {
    console.log('Attempting to launch Chrome...');
    
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      userDataDir: userDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ SUCCESS! Chrome launched successfully!');
    console.log('Creating a test page...');
    
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    
    console.log('✅ Test page loaded!');
    console.log('\nChrome will stay open for 10 seconds...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await browser.close();
    console.log('\n✅ Test completed successfully!');
    console.log('Your Chrome permissions are working correctly.\n');
    
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    console.error('\nThis means Chrome cannot launch due to permission issues.');
    console.error('Please follow the instructions in MACOS-FIX.md\n');
  }
}

testChrome();
