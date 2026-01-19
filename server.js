const express = require('express');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
require('dotenv').config();

// Use stealth plugin to avoid detection
puppeteerExtra.use(StealthPlugin());

// Helper function to wait (replacement for page.waitForTimeout)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Simulate human-like mouse movement
async function simulateHumanBehavior(page) {
  try {
    // Random mouse movements
    const movements = 3 + Math.floor(Math.random() * 3); // 3-5 movements
    for (let i = 0; i < movements; i++) {
      const x = Math.floor(Math.random() * 1920);
      const y = Math.floor(Math.random() * 1080);
      await page.mouse.move(x, y, { steps: 10 });
      await delay(100 + Math.random() * 200);
    }
    
    // Random scroll
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 300);
    });
    await delay(500 + Math.random() * 500);
  } catch (error) {
    // Ignore errors in simulation
  }
}

// Random human-like delay
const randomDelay = (min = 1000, max = 3000) => {
  return delay(min + Math.random() * (max - min));
};


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store for tracking requests
const requestStore = new Map();

// Track active requests count (for monitoring)
let activeRequestsCount = 0;
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Session persistence
const COOKIES_PATH = path.join(__dirname, 'linkedin-cookies.json');
let browserInstance = null;

// Configure page to avoid detection
async function configurePage(page) {
  // Set realistic viewport and user agent (updated to latest Chrome)
  await page.setViewport({ 
    width: 1920, 
    height: 1080,
    deviceScaleFactor: 1,
    hasTouch: false,
    isLandscape: true,
    isMobile: false,
  });
  
  // Use latest Chrome user agent
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  
  // Add extra headers to appear more like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  });
  
  // Enable request interception to block analytics and speed up loading
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    const resourceType = request.resourceType();
    
    // Block chrome-extension requests that cause errors
    if (url.startsWith('chrome-extension://')) {
      request.abort();
      return;
    }
    
    // Block analytics, ads, and unnecessary resources
    const blockedDomains = [
      'google-analytics.com',
      'doubleclick.net',
      'analytics.google.com',
      'googletagmanager.com',
      'hotjar.com',
      'mouseflow.com',
      'clarity.ms',
      'ads.linkedin.com',
      'px.ads.linkedin.com',
      'analytics.pointdrive.linkedin.com'
    ];
    
    const shouldBlock = blockedDomains.some(domain => url.includes(domain)) ||
                       (resourceType === 'image' && !url.includes('media.licdn.com')) ||
                       resourceType === 'font' ||
                       resourceType === 'media';
    
    if (shouldBlock) {
      request.abort();
    } else {
      request.continue();
    }
  });
  
  // Enhanced stealth techniques (Note: stealth plugin handles most of this, but adding extra layers)
  await page.evaluateOnNewDocument(() => {
    // Delete webdriver property completely
    delete Object.getPrototypeOf(navigator).webdriver;
    
    // Override chrome object more thoroughly
    window.chrome = {
      app: {
        isInstalled: false,
        InstallState: {
          DISABLED: 'disabled',
          INSTALLED: 'installed',
          NOT_INSTALLED: 'not_installed'
        },
        RunningState: {
          CANNOT_RUN: 'cannot_run',
          READY_TO_RUN: 'ready_to_run',
          RUNNING: 'running'
        }
      },
      runtime: {
        OnInstalledReason: {
          CHROME_UPDATE: 'chrome_update',
          INSTALL: 'install',
          SHARED_MODULE_UPDATE: 'shared_module_update',
          UPDATE: 'update'
        },
        OnRestartRequiredReason: {
          APP_UPDATE: 'app_update',
          OS_UPDATE: 'os_update',
          PERIODIC: 'periodic'
        },
        PlatformArch: {
          ARM: 'arm',
          ARM64: 'arm64',
          MIPS: 'mips',
          MIPS64: 'mips64',
          X86_32: 'x86-32',
          X86_64: 'x86-64'
        },
        PlatformNaclArch: {
          ARM: 'arm',
          MIPS: 'mips',
          MIPS64: 'mips64',
          X86_32: 'x86-32',
          X86_64: 'x86-64'
        },
        PlatformOs: {
          ANDROID: 'android',
          CROS: 'cros',
          LINUX: 'linux',
          MAC: 'mac',
          OPENBSD: 'openbsd',
          WIN: 'win'
        },
        RequestUpdateCheckStatus: {
          NO_UPDATE: 'no_update',
          THROTTLED: 'throttled',
          UPDATE_AVAILABLE: 'update_available'
        }
      },
      loadTimes: function() {},
      csi: function() {}
    };
    
    // Mock more realistic plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        return [
          {
            0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: {type: "application/pdf", suffixes: "pdf", description: ""},
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
          },
          {
            0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable"},
            1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable"},
            description: "",
            filename: "internal-nacl-plugin",
            length: 2,
            name: "Native Client"
          }
        ];
      }
    });
    
    // Mock languages more realistically
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    
    // Override permissions more thoroughly
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // Mock hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
    });
    
    // Mock device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });
    
    // Mock connection
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false
      })
    });
    
    // Override battery API to return null (more realistic for desktop)
    Object.defineProperty(navigator, 'getBattery', {
      value: () => Promise.resolve(null)
    });
    
    // Suppress console errors related to extensions
    const originalError = console.error;
    console.error = function(...args) {
      const msg = args[0]?.toString() || '';
      if (msg.includes('chrome-extension') || msg.includes('Extension')) {
        return; // Suppress extension-related errors
      }
      originalError.apply(console, args);
    };
  });
}

// Initialize browser with session
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  console.log('🚀 Launching new browser instance with stealth mode...');
  
  // Use workspace directory for chrome data (avoids macOS SIP restrictions)
  const customUserDataDir = path.join(__dirname, '.chrome-user-data');
  const crashDumpsDir = path.join(__dirname, '.chrome-crashes');
  
  // Create crash dumps directory if it doesn't exist
  try {
    await fs.mkdir(crashDumpsDir, { recursive: true });
  } catch (e) {
    // Directory already exists
  }
  
  // Determine Chrome path based on environment
  const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
    (process.platform === 'darwin' 
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome-stable');
  
  browserInstance = await puppeteerExtra.launch({
    headless: process.env.NODE_ENV === 'production' ? 'new' : false,
    executablePath: chromePath,
    userDataDir: customUserDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-infobars',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-ipc-flooding-protection',
      '--disable-client-side-phishing-detection',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-pings',
      '--disable-default-apps',
      '--mute-audio',
      '--no-zygote',
      '--disable-accelerated-2d-canvas',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      '--lang=en-US,en',
      '--disable-notifications',
      '--disable-session-crashed-bubble',
      '--noerrdialogs',
      '--new-window'
    ],
    ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection', '--disable-component-update'],
    ignoreHTTPSErrors: true,
    defaultViewport: null
  });

  return browserInstance;
}

// Save session cookies
async function saveCookies(page) {
  const cookies = await page.cookies();
  await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  console.log('🍪 Cookies saved');
}

// Load session cookies
async function loadCookies(page) {
  try {
    const cookiesString = await fs.readFile(COOKIES_PATH, 'utf-8');
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log('🍪 Cookies loaded');
    return true;
  } catch (error) {
    console.log('⚠️  No saved cookies found');
    return false;
  }
}

// Clear session cookies (use when LinkedIn blocks the session)
async function clearSession() {
  try {
    await fs.unlink(COOKIES_PATH);
    console.log('🧹 Session cookies cleared');
    
    // Close browser to force fresh start
    if (browserInstance && browserInstance.isConnected()) {
      await browserInstance.close();
      browserInstance = null;
      console.log('🔄 Browser instance closed for fresh start');
    }
    
    return true;
  } catch (error) {
    console.log('⚠️  No session to clear or error:', error.message);
    return false;
  }
}

// Logout from LinkedIn
async function logoutFromLinkedIn(page) {
  console.log('🚪 Logging out from current LinkedIn session...');
  
  try {
    // Navigate to LinkedIn settings/logout
    await page.goto('https://www.linkedin.com/m/logout/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await delay(3000);
    console.log('✅ Logged out successfully');
    return true;
  } catch (error) {
    console.log('⚠️  Logout attempt failed, clearing cookies instead:', error.message);
    
    // Clear cookies as fallback
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
    
    return true;
  }
}

// Check which account is currently logged in
async function getCurrentLoggedInEmail(page) {
  try {
    const email = await page.evaluate(() => {
      // Try to find email in various places
      const emailElements = document.querySelectorAll('[data-test-user-email], .profile-rail-card__actor-link');
      for (const elem of emailElements) {
        if (elem.textContent && elem.textContent.includes('@')) {
          return elem.textContent.trim();
        }
      }
      return null;
    });
    
    return email;
  } catch (error) {
    return null;
  }
}

// Login to LinkedIn (with session persistence)
async function ensureLoggedIn(page, userEmail = null, userPassword = null) {
  const linkedinEmail = userEmail || process.env.LINKEDIN_EMAIL;
  const linkedinPassword = userPassword || process.env.LINKEDIN_PASSWORD;
  
  console.log('🔐 Checking LinkedIn session for:', linkedinEmail);
  
  // Only load cookies if using bot account (not user credentials)
  // If user provides their credentials, we MUST NOT load bot cookies
  if (!userEmail) {
    await loadCookies(page);
  } else {
    console.log('👤 User credentials provided - skipping bot cookie loading');
  }
  
  // Navigate to LinkedIn feed to check if logged in
  try {
    await page.goto('https://www.linkedin.com/feed/', { 
      waitUntil: 'networkidle2',
      timeout: 45000 
    });
  } catch (error) {
    console.log('⚠️  Navigation timeout, continuing...', error.message);
  }
  
  // Simulate human behavior
  await randomDelay(3000, 5000);
  await simulateHumanBehavior(page);
  
  // Check if we're already logged in (multiple indicators)
  const loginCheck = await page.evaluate(() => {
    const hasLoginForm = !!document.querySelector('#session_key');
    const hasFeedContent = !!document.querySelector('.feed-shared-update-v2');
    const hasGlobalNav = !!document.querySelector('.global-nav');
    const currentUrl = window.location.href;
    
    return {
      hasLoginForm,
      hasFeedContent,
      hasGlobalNav,
      currentUrl,
      isLoggedIn: !hasLoginForm && (hasFeedContent || hasGlobalNav || currentUrl.includes('/feed'))
    };
  });
  
  console.log('Login check:', loginCheck);
  
  // If already logged in, check if it's the right account
  if (loginCheck.isLoggedIn) {
    if (userEmail) {
      // User credentials provided - we need to check if correct account is logged in
      console.log('⚠️  Someone is already logged in. Need to verify it\'s the right account...');
      
      const currentEmail = await getCurrentLoggedInEmail(page);
      if (currentEmail && currentEmail.toLowerCase() === linkedinEmail.toLowerCase()) {
        console.log('✅ Correct account already logged in:', currentEmail);
        return;
      } else {
        console.log('❌ Wrong account is logged in. Logging out...');
        await logoutFromLinkedIn(page);
        await delay(2000);
      }
    } else {
      // Bot account - trust the saved session
      console.log('✅ Already logged in with saved session');
      return;
    }
  }
  
  console.log('🔑 Logging in...');
  
  // Go to login page
  await page.goto('https://www.linkedin.com/login', { 
    waitUntil: 'networkidle2',
    timeout: 45000
  });
  
  await randomDelay(2000, 4000);
  await simulateHumanBehavior(page);
  
  // Debug: Check what page we got
  const currentPageUrl = page.url();
  console.log('Current page after navigation:', currentPageUrl);
  
  // Check for "Sign in to another account" or pre-filled email
  const hasAnotherAccountOption = await page.evaluate(() => {
    // Look for "Sign in with different account" or similar buttons
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const anotherAccountButton = buttons.find(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      return text.includes('another account') || 
             text.includes('different account') || 
             text.includes('switch account') ||
             text.includes('use another');
    });
    
    // Also check if email field is pre-filled
    const emailField = document.querySelector('#username, #session_key, input[name="session_key"]');
    const isPreFilled = emailField && emailField.value && emailField.value.length > 0;
    
    return {
      hasButton: !!anotherAccountButton,
      buttonText: anotherAccountButton?.textContent?.trim(),
      isPreFilled: isPreFilled,
      preFilledEmail: emailField?.value
    };
  });
  
  console.log('Login page status:', hasAnotherAccountOption);
  
  // If we're trying to login with user credentials and see a different account, click "another account"
  if (userEmail && (hasAnotherAccountOption.hasButton || hasAnotherAccountOption.isPreFilled)) {
    if (hasAnotherAccountOption.preFilledEmail && 
        hasAnotherAccountOption.preFilledEmail.toLowerCase() !== linkedinEmail.toLowerCase()) {
      console.log(`⚠️  Login page shows ${hasAnotherAccountOption.preFilledEmail} but we need ${linkedinEmail}`);
      
      if (hasAnotherAccountOption.hasButton) {
        console.log('🔄 Clicking "Sign in to another account"...');
        const clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const anotherAccountButton = buttons.find(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('another account') || 
                   text.includes('different account') || 
                   text.includes('switch account') ||
                   text.includes('use another');
          });
          
          if (anotherAccountButton) {
            anotherAccountButton.click();
            return true;
          }
          return false;
        });
        
        if (clicked) {
          await delay(2000);
          console.log('✅ Switched to new account login form');
        }
      } else {
        // Clear the pre-filled email
        console.log('🔄 Clearing pre-filled email field...');
        await page.evaluate(() => {
          const emailField = document.querySelector('#username, #session_key, input[name="session_key"]');
          if (emailField) {
            emailField.value = '';
          }
        });
      }
    }
  }
  
  // Debug: Take a screenshot to see what page we're on
  try {
    await page.screenshot({ path: path.join(__dirname, 'debug-login-page.png') });
    console.log('📸 Screenshot saved as debug-login-page.png');
  } catch (e) {
    console.log('Could not save screenshot:', e.message);
  }
  
  // Check for CAPTCHA or verification challenges
  const hasCaptcha = await page.evaluate(() => {
    // Check for various CAPTCHA and challenge indicators
    return !!(
      document.querySelector('iframe[title*="recaptcha"]') ||
      document.querySelector('.g-recaptcha') ||
      document.querySelector('[data-recaptcha]') ||
      document.querySelector('input[name="captcha"]') ||
      document.querySelector('#captcha') ||
      document.body.innerText.toLowerCase().includes('verify') ||
      document.body.innerText.toLowerCase().includes('security check')
    );
  });
  
  if (hasCaptcha) {
    console.log('🤖 CAPTCHA or security challenge detected!');
    console.log('⏳ Please solve the CAPTCHA/challenge in the browser window...');
    console.log('💡 Waiting up to 2 minutes for you to complete it...');
    console.log('🌐 Check the Chrome browser window that opened!');
    
    // Wait for user to solve the CAPTCHA (check every 2 seconds for up to 2 minutes)
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes (60 * 2 seconds)
    let solved = false;
    
    while (attempts < maxAttempts && !solved) {
      await delay(2000);
      attempts++;
      
      const currentUrl = page.url();
      
      // Check if we've moved past the challenge page
      if (!currentUrl.includes('checkpoint') && 
          !currentUrl.includes('challenge') && 
          currentUrl.includes('linkedin.com')) {
        
        // Double-check that login form is present
        const loginFormPresent = await page.evaluate(() => {
          return !!(
            document.querySelector('#username') ||
            document.querySelector('#session_key') ||
            document.querySelector('input[name="session_key"]')
          );
        });
        
        if (loginFormPresent) {
          solved = true;
          console.log('✅ Challenge solved! Continuing with login...');
        }
      }
      
      if (attempts % 15 === 0) {
        console.log(`⏳ Still waiting... (${Math.floor(attempts * 2 / 60)}m ${(attempts * 2) % 60}s elapsed)`);
      }
    }
    
    if (!solved) {
      throw new Error('Timeout waiting for CAPTCHA/challenge to be solved. Please try again.');
    }
    
    // Small delay after solving
    await delay(2000);
  }
  
  // Try to find the username field with better error handling
  let usernameSelector = null;
  const possibleSelectors = ['#username', '#session_key', 'input[name="session_key"]', 'input[type="email"]'];
  
  for (const selector of possibleSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 3000 });
      usernameSelector = selector;
      console.log(`✅ Found username field with selector: ${selector}`);
      break;
    } catch (e) {
      console.log(`⚠️  Selector not found: ${selector}`);
    }
  }
  
  if (!usernameSelector) {
    // Get page content for debugging
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Page content preview:', bodyText.substring(0, 500));
    throw new Error('Could not find LinkedIn login form. LinkedIn may be blocking automated access or showing a verification page. Please check debug-login-page.png for details.');
  }
  
  // Fill login form
  await page.type(usernameSelector, linkedinEmail, { delay: 100 });
  
  // Find password field
  const passwordSelectors = ['#password', 'input[name="session_password"]', 'input[type="password"]'];
  let passwordSelector = null;
  
  for (const selector of passwordSelectors) {
    try {
      const elem = await page.$(selector);
      if (elem) {
        passwordSelector = selector;
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  if (!passwordSelector) {
    throw new Error('Could not find password field on LinkedIn login page.');
  }
  
  await page.type(passwordSelector, linkedinPassword, { delay: 100 });
  
  console.log('🔑 Submitting login form...');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for navigation with timeout handling
  try {
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (error) {
    console.log('⚠️  Navigation after login timeout, checking current state...');
  }
  
  // Wait a bit for any redirects
  await delay(5000);
  
  // Check for verification challenge after login
  const urlAfterLogin = page.url();
  console.log('URL after login:', urlAfterLogin);
  
  if (urlAfterLogin.includes('checkpoint') || urlAfterLogin.includes('challenge')) {
    console.log('🔐 LinkedIn verification required after login!');
    console.log('⏳ Please complete the verification in the browser window...');
    console.log('💡 Waiting up to 3 minutes for you to complete it...');
    
    // Wait for user to complete verification
    let attempts = 0;
    const maxAttempts = 90; // 3 minutes (90 * 2 seconds)
    let verified = false;
    
    while (attempts < maxAttempts && !verified) {
      await delay(2000);
      attempts++;
      
      const currentUrl = page.url();
      
      // Check if we've moved past the verification page
      if (!currentUrl.includes('checkpoint') && 
          !currentUrl.includes('challenge') &&
          (currentUrl.includes('/feed') || currentUrl.includes('/in/'))) {
        verified = true;
        console.log('✅ Verification completed! Continuing...');
      }
      
      if (attempts % 15 === 0) {
        console.log(`⏳ Still waiting... (${Math.floor(attempts * 2 / 60)}m ${(attempts * 2) % 60}s elapsed)`);
      }
    }
    
    if (!verified) {
      throw new Error('Timeout waiting for LinkedIn verification to be completed. Please try again.');
    }
    
    // Small delay after verification
    await delay(3000);
  }
  
  // Verify we're actually logged in
  const verifyLogin = await page.evaluate(() => {
    return {
      hasGlobalNav: !!document.querySelector('.global-nav'),
      url: window.location.href,
      hasLoginError: !!document.querySelector('.alert--error, .login-error')
    };
  });
  
  console.log('Login verification:', verifyLogin);
  
  if (verifyLogin.hasLoginError) {
    throw new Error('Login failed. Please check your LinkedIn credentials.');
  }
  
  if (!verifyLogin.hasGlobalNav && !urlAfterLogin.includes('/feed')) {
    throw new Error('Login may have failed. Please verify credentials and check if account needs manual verification.');
  }
  
  // Save cookies for future use (only for bot account)
  if (!userEmail) {
    await saveCookies(page);
  }
  console.log('✅ Login successful');
}

// Main PDF generation function
async function generateLinkedInPDF(profileUrl) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Configure page to avoid detection
    await configurePage(page);
    
    // Set up download handling
    const client = await page.createCDPSession();
    const downloadPath = path.join(__dirname, 'downloads');
    
    // Create downloads directory if it doesn't exist
    try {
      await fs.mkdir(downloadPath, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
    
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });
    
    // Ensure we're logged in
    await ensureLoggedIn(page);
    
    console.log('🔍 Navigating to profile:', profileUrl);
    
    // Add human-like delay before navigation
    await randomDelay(2000, 4000);
    
    // Navigate to target profile with multiple retry attempts
    let navigationSuccess = false;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Navigation attempt ${attempt}/${maxRetries}...`);
        await page.goto(profileUrl, { 
          waitUntil: 'networkidle2',
          timeout: 60000 
        });
        navigationSuccess = true;
        break;
      } catch (error) {
        console.log(`⚠️  Navigation attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          throw new Error(`Failed to load LinkedIn profile after ${maxRetries} attempts. LinkedIn may be blocking automated access or the profile URL is incorrect.`);
        }
        await randomDelay(3000, 5000);
      }
    }
    
    // Wait for page to render with human-like delay
    await randomDelay(5000, 8000);
    
    // Simulate human behavior on profile page
    await simulateHumanBehavior(page);
    
    // Check if we're actually on a profile page or got redirected
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Check for various LinkedIn profile selectors (they change frequently)
    const profileSelectors = [
      '.pv-top-card',
      '.scaffold-layout__main',
      'main.scaffold-layout__main',
      '[data-view-name="profile-view"]',
      '.profile-background-image',
      'section.artdeco-card',
      'body'  // Fallback
    ];
    
    let selectorFound = false;
    for (const selector of profileSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        console.log(`✅ Found profile element: ${selector}`);
        selectorFound = true;
        break;
      } catch (e) {
        console.log(`⚠️  Selector not found: ${selector}`);
      }
    }
    
    if (!selectorFound) {
      throw new Error('Could not find LinkedIn profile elements. Page may have redirected or LinkedIn structure changed.');
    }
    
    console.log('📄 Clicking "More" button to access Save to PDF...');
    
    // Try different selectors for the "More" button
    const moreButtonSelectors = [
      'button[aria-label*="More"]',
      'button[aria-label*="more"]',
      'button:has-text("More")',
      '.pvs-overflow-actions-dropdown__trigger',
      '[data-control-name="overflow_action"]',
      'button.artdeco-dropdown__trigger'
    ];
    
    let moreButtonClicked = false;
    for (const selector of moreButtonSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log(`✅ Clicked "More" button using selector: ${selector}`);
          moreButtonClicked = true;
          break;
        }
      } catch (e) {
        console.log(`⚠️  Failed to click More button with selector: ${selector}`);
      }
    }
    
    if (!moreButtonClicked) {
      throw new Error('Could not find or click the "More" button on the profile page.');
    }
    
    // Wait for dropdown to appear with human-like delay
    await randomDelay(1500, 3000);
    
    console.log('📥 Searching for "Save to PDF" option...');
    
    // Debug: Get all dropdown items
    const dropdownItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.artdeco-dropdown__item, div[role="menuitem"], li[role="menuitem"]'));
      return items.map(item => ({
        text: item.textContent?.trim(),
        ariaLabel: item.getAttribute('aria-label'),
        className: item.className
      }));
    });
    console.log('Dropdown items found:', dropdownItems);
    
    // Try to find and click "Save to PDF" by text content
    let pdfButtonClicked = false;
    
    try {
      // Method 1: Find by text content using evaluate
      pdfButtonClicked = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.artdeco-dropdown__item, div[role="menuitem"], li[role="menuitem"], button'));
        const pdfItem = items.find(item => {
          const text = item.textContent?.trim().toLowerCase();
          return text && (text.includes('save to pdf') || text.includes('save as pdf') || text === 'save to pdf');
        });
        
        if (pdfItem) {
          pdfItem.click();
          return true;
        }
        return false;
      });
      
      if (pdfButtonClicked) {
        console.log('✅ Clicked "Save to PDF" using text content search');
      }
    } catch (e) {
      console.log('⚠️  Method 1 failed:', e.message);
    }
    
    // Method 2: Try specific selectors
    if (!pdfButtonClicked) {
      const saveToPdfSelectors = [
        'div[aria-label="Save to PDF"]',
        '[aria-label="Save to PDF"]',
        'span:has-text("Save to PDF")',
        '.artdeco-dropdown__item:has-text("Save to PDF")',
        'li:has-text("Save to PDF")'
      ];
      
      for (const selector of saveToPdfSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log(`✅ Clicked "Save to PDF" using selector: ${selector}`);
          pdfButtonClicked = true;
          break;
        } catch (e) {
          console.log(`⚠️  Selector failed: ${selector}`);
        }
      }
    }
    
    if (!pdfButtonClicked) {
      throw new Error('Could not find or click the "Save to PDF" option. Available items: ' + JSON.stringify(dropdownItems));
    }
    
    console.log('⏳ Waiting for PDF download to complete...');
    
    // Wait for download to start and complete with human-like delays
    await randomDelay(8000, 12000); // Give LinkedIn time to generate and download the PDF
    
    // Wait for PDF to be fully downloaded
    await randomDelay(4000, 7000);
    
    // Find the downloaded PDF file
    const files = await fs.readdir(downloadPath);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      throw new Error('PDF file was not downloaded. LinkedIn may have changed the download process.');
    }
    
    // Get the most recent PDF file
    const pdfFile = pdfFiles[pdfFiles.length - 1];
    const pdfPath = path.join(downloadPath, pdfFile);
    
    console.log('✅ PDF downloaded:', pdfFile);
    
    // Read the PDF file
    const pdfBuffer = await fs.readFile(pdfPath);
    
    // Clean up - delete the downloaded file
    await fs.unlink(pdfPath);
    
    console.log('✅ PDF file processed and cleaned up');
    return pdfBuffer;
    
  } finally {
    await page.close();
  }
}

// New function: Download user's own profile using Resources -> Save to PDF
async function generateUserOwnProfilePDF(userEmail, userPassword) {
  // IMPORTANT: Use a separate browser instance for user credentials
  // to avoid conflicts with bot account session
  console.log('🌐 Launching separate browser instance for user credentials...');
  
  const customUserDataDir = path.join(__dirname, '.chrome-user-data-temp');
  
  // Determine Chrome path based on environment
  const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
    (process.platform === 'darwin' 
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome-stable');
  
  const browser = await puppeteerExtra.launch({
    headless: process.env.NODE_ENV === 'production' ? 'new' : false,
    executablePath: chromePath,
    userDataDir: customUserDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-infobars',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-ipc-flooding-protection',
      '--disable-client-side-phishing-detection',
      '--disable-sync',
      '--metrics-recording-only',
      '--no-pings',
      '--disable-default-apps',
      '--mute-audio',
      '--no-zygote',
      '--disable-accelerated-2d-canvas',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      '--lang=en-US,en',
      '--disable-notifications',
      '--disable-session-crashed-bubble',
      '--noerrdialogs',
      '--new-window'
    ],
    ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection', '--disable-component-update'],
    ignoreHTTPSErrors: true,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  try {
    // Configure page to avoid detection
    await configurePage(page);
    
    // Set up download handling
    const client = await page.createCDPSession();
    const downloadPath = path.join(__dirname, 'downloads');
    
    // Create downloads directory if it doesn't exist
    try {
      await fs.mkdir(downloadPath, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
    
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });
    
    // Login with user credentials
    console.log('🔐 Logging in with user credentials...');
    await ensureLoggedIn(page, userEmail, userPassword);
    
    console.log('🔍 Navigating directly to user profile...');
    
    // Navigate directly to /in/me/ which will redirect to actual profile
    // Use 'networkidle2' which is less strict than networkidle0
    await page.goto('https://www.linkedin.com/in/me/', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for initial page load with progressive checks
    console.log('⏳ Waiting for profile page to load completely...');
    
    // Wait for actual content to appear (not just skeleton)
    let contentLoaded = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds total
    
    while (!contentLoaded && attempts < maxAttempts) {
      await delay(1000);
      attempts++;
      
      const pageState = await page.evaluate(() => {
        const skeletons = document.querySelectorAll('.skeleton, [class*="skeleton"], [class*="shimmer"]');
        const hasRealContent = !!(
          document.querySelector('.pv-top-card') ||
          document.querySelector('.pv-text-details__left-panel') ||
          document.querySelector('[data-view-name="profile-view"]') ||
          document.querySelector('h1')
        );
        const hasManyElements = document.querySelectorAll('*').length > 100;
        
        return {
          skeletonCount: skeletons.length,
          hasRealContent,
          hasManyElements,
          isLoaded: hasRealContent && hasManyElements
        };
      });
      
      if (pageState.isLoaded) {
        contentLoaded = true;
        console.log(`✅ Page loaded after ${attempts} seconds`);
      }
      
      if (attempts % 5 === 0) {
        console.log(`⏳ Still waiting... (${attempts}s elapsed, skeletons: ${pageState.skeletonCount})`);
      }
    }
    
    if (!contentLoaded) {
      console.log('⚠️  Page may still be loading. Trying reload...');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await delay(15000); // Give it more time after reload
    }
    
    // Additional stabilization wait
    await delay(5000);
    
    // Get actual profile URL after redirect
    let profileUrl;
    try {
      profileUrl = page.url();
      console.log('✅ User profile URL:', profileUrl);
    } catch (e) {
      console.log('⚠️  Could not get page URL:', e.message);
      throw new Error('FALLBACK_TO_BOT');
    }
    
    // Scroll to top to ensure buttons are visible
    try {
      await page.evaluate(() => window.scrollTo(0, 0));
      console.log('✅ Scrolled to top of profile page');
    } catch (e) {
      console.log('⚠️  Could not scroll:', e.message);
      throw new Error('FALLBACK_TO_BOT');
    }
    
    await delay(2000);
    
    // Take screenshot for debugging
    try {
      await page.screenshot({ path: path.join(__dirname, 'debug-user-profile.png') });
      console.log('📸 Profile screenshot saved as debug-user-profile.png');
    } catch (e) {
      console.log('Could not save screenshot:', e.message);
    }
    
    // Look for "Resources" button (as shown in the screenshot)
    console.log('📄 Looking for "Resources" button...');
    
    // Debug: Get all buttons on the page to see what's available
    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'));
      return buttons.map(btn => ({
        text: btn.textContent?.trim(),
        ariaLabel: btn.getAttribute('aria-label'),
        className: btn.className,
        id: btn.id
      })).slice(0, 20); // First 20 buttons
    });
    console.log('Available buttons on profile:', JSON.stringify(allButtons, null, 2));
    
    const resourcesButtonSelectors = [
      'button:has-text("Resources")',
      'button[aria-label*="Resources"]',
      'div[aria-label*="Resources"]',
      '.artdeco-dropdown__trigger:has-text("Resources")',
      'button.pvs-profile-actions__action'
    ];
    
    let resourcesButtonClicked = false;
    
    // Try to find and click Resources button using text content
    try {
      resourcesButtonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'));
        const resourcesButton = buttons.find(btn => {
          const text = btn.textContent?.trim().toLowerCase();
          return text === 'resources' || text.includes('resources');
        });
        
        if (resourcesButton) {
          console.log('Found Resources button with text:', resourcesButton.textContent);
          resourcesButton.click();
          return true;
        }
        return false;
      });
      
      if (resourcesButtonClicked) {
        console.log('✅ Clicked "Resources" button');
      }
    } catch (e) {
      console.log('⚠️  Text-based Resources search failed:', e.message);
    }
    
    // Try specific selectors
    if (!resourcesButtonClicked) {
      for (const selector of resourcesButtonSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log(`✅ Clicked "Resources" button using selector: ${selector}`);
          resourcesButtonClicked = true;
          break;
        } catch (e) {
          console.log(`⚠️  Resources selector failed: ${selector}`);
        }
      }
    }
    
    // If Resources button not found, try to extract public profile URL and navigate to it
    if (!resourcesButtonClicked) {
      console.log('⚠️  Resources button not found. Trying to extract public profile URL...');
      
      // Try to find the public profile URL on the page
      const publicProfileUrl = await page.evaluate(() => {
        // Look for text containing linkedin.com/in/
        const textElements = Array.from(document.querySelectorAll('*'));
        for (const element of textElements) {
          const text = element.textContent?.trim();
          if (text && text.includes('linkedin.com/in/') && !text.includes('http')) {
            // Extract the profile path
            const match = text.match(/linkedin\.com\/in\/([a-zA-Z0-9\-]+)/);
            if (match) {
              return `https://www.linkedin.com/in/${match[1]}`;
            }
          }
        }
        
        // Alternative: check for elements with specific classes or attributes
        const profileLinks = Array.from(document.querySelectorAll('a[href*="/in/"]'));
        for (const link of profileLinks) {
          const href = link.getAttribute('href');
          if (href && href.includes('/in/') && !href.includes('/in/me')) {
            if (href.startsWith('http')) {
              return href;
            } else if (href.startsWith('/in/')) {
              return `https://www.linkedin.com${href}`;
            }
          }
        }
        
        return null;
      });
      
      if (publicProfileUrl) {
        console.log(`✅ Found public profile URL: ${publicProfileUrl}`);
        console.log('🔄 Navigating to public profile URL...');
        
        await page.goto(publicProfileUrl, { 
          waitUntil: 'networkidle2',
          timeout: 60000 
        });
        
        console.log('⏳ Waiting for public profile to load...');
        
        // Wait for content with better detection
        let publicContentLoaded = false;
        let publicAttempts = 0;
        
        while (!publicContentLoaded && publicAttempts < 25) {
          await delay(1000);
          publicAttempts++;
          
          const state = await page.evaluate(() => {
            const hasContent = !!(
              document.querySelector('.pv-top-card') ||
              document.querySelector('h1') ||
              document.querySelectorAll('button').length > 10
            );
            return { hasContent };
          });
          
          if (state.hasContent) {
            publicContentLoaded = true;
            console.log(`✅ Public profile loaded after ${publicAttempts} seconds`);
          }
        }
        
        if (!publicContentLoaded) {
          console.log('⚠️  Trying reload of public profile...');
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
          await delay(10000);
        }
        
        await delay(3000);
        
        // Update profileUrl variable
        profileUrl = page.url();
        console.log('✅ Navigated to:', profileUrl);
        
        // Scroll to top again
        try {
          await page.evaluate(() => window.scrollTo(0, 0));
          console.log('✅ Scrolled to top');
        } catch (e) {
          console.log('⚠️  Could not scroll:', e.message);
        }
        
        await delay(2000);
        
        // Take new screenshot
        try {
          await page.screenshot({ path: path.join(__dirname, 'debug-public-profile.png') });
          console.log('📸 Public profile screenshot saved as debug-public-profile.png');
        } catch (e) {
          console.log('Could not save screenshot:', e.message);
        }
        
        // Try to find Resources button again
        console.log('📄 Looking for "Resources" button again...');
        
        try {
          resourcesButtonClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'));
            const resourcesButton = buttons.find(btn => {
              const text = btn.textContent?.trim().toLowerCase();
              return text === 'resources' || text.includes('resources');
            });
            
            if (resourcesButton) {
              console.log('Found Resources button with text:', resourcesButton.textContent);
              resourcesButton.click();
              return true;
            }
            return false;
          });
          
          if (resourcesButtonClicked) {
            console.log('✅ Clicked "Resources" button on public profile');
          }
        } catch (e) {
          console.log('⚠️  Resources search failed on public profile:', e.message);
        }
        
        // Try specific selectors again
        if (!resourcesButtonClicked) {
          for (const selector of resourcesButtonSelectors) {
            try {
              await page.click(selector, { timeout: 2000 });
              console.log(`✅ Clicked "Resources" button using selector: ${selector}`);
              resourcesButtonClicked = true;
              break;
            } catch (e) {
              console.log(`⚠️  Resources selector failed: ${selector}`);
            }
          }
        }
      } else {
        console.log('⚠️  Could not find public profile URL on page');
      }
    }
    
    if (!resourcesButtonClicked) {
      console.log('⚠️  Could not find "Resources" button even after trying public URL. Will fallback to bot account method.');
      throw new Error('FALLBACK_TO_BOT');
    }
    
    // Wait for dropdown to appear
    await delay(2000);
    
    console.log('📥 Looking for "Save to PDF" in Resources menu...');
    
    // Debug: Get all dropdown items
    const dropdownItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.artdeco-dropdown__item, div[role="menuitem"], li[role="menuitem"], a'));
      return items.map(item => ({
        text: item.textContent?.trim(),
        ariaLabel: item.getAttribute('aria-label'),
        href: item.getAttribute('href'),
        className: item.className
      }));
    });
    console.log('Resources dropdown items:', dropdownItems);
    
    // Try to find and click "Save to PDF"
    let pdfButtonClicked = false;
    
    try {
      pdfButtonClicked = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.artdeco-dropdown__item, div[role="menuitem"], li[role="menuitem"], a, button'));
        const pdfItem = items.find(item => {
          const text = item.textContent?.trim().toLowerCase();
          return text && (text.includes('save to pdf') || text.includes('save as pdf'));
        });
        
        if (pdfItem) {
          pdfItem.click();
          return true;
        }
        return false;
      });
      
      if (pdfButtonClicked) {
        console.log('✅ Clicked "Save to PDF" in Resources menu');
      }
    } catch (e) {
      console.log('⚠️  Save to PDF click failed:', e.message);
    }
    
    if (!pdfButtonClicked) {
      console.log('⚠️  Could not find "Save to PDF" option. Will fallback to bot account method.');
      throw new Error('FALLBACK_TO_BOT');
    }
    
    console.log('⏳ Waiting for PDF download to complete...');
    
    // Wait for download to start and complete
    await delay(10000);
    await delay(5000);
    
    // Find the downloaded PDF file
    const files = await fs.readdir(downloadPath);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      throw new Error('PDF file was not downloaded. LinkedIn may have changed the download process.');
    }
    
    // Get the most recent PDF file
    const pdfFile = pdfFiles[pdfFiles.length - 1];
    const pdfPath = path.join(downloadPath, pdfFile);
    
    console.log('✅ PDF downloaded:', pdfFile);
    
    // Read the PDF file
    const pdfBuffer = await fs.readFile(pdfPath);
    
    // Clean up - delete the downloaded file
    await fs.unlink(pdfPath);
    
    console.log('✅ PDF file processed and cleaned up');
    return { pdfBuffer, profileUrl };
    
  } finally {
    // Clean up: close page and browser for user sessions
    try {
      await page.close();
      await browser.close();
      console.log('🔒 User session browser closed');
      
      // Clean up temporary user data directory
      // (Keep it for now in case we need to debug, but could delete it)
    } catch (e) {
      console.log('⚠️  Error closing browser:', e.message);
    }
  }
}

// Auto scroll helper
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.documentElement.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Process individual request (runs in parallel)
async function processRequest(job) {
  const { requestId, linkedinUrl, emailAddress, userEmail, userPassword, loginMethod } = job;
  
  activeRequestsCount++;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Processing request: ${requestId}`);
  console.log(`Method: ${loginMethod || 'bot'}`);
  console.log(`Active requests: ${activeRequestsCount}`);
  if (linkedinUrl) console.log(`Profile: ${linkedinUrl}`);
  if (userEmail) console.log(`User Email: ${userEmail}`);
  console.log(`Email: ${emailAddress}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    // Update status
    requestStore.set(requestId, { 
      status: loginMethod === 'user' ? 'logging_in' : 'generating_pdf', 
      message: loginMethod === 'user' ? 'Logging in to your LinkedIn account...' : 'Generating PDF...',
      loginMethod
    });
    
    let pdfBuffer;
    let profileUrl = linkedinUrl;
    
    // Choose method based on login type
    if (loginMethod === 'user') {
      // User login method - download their own profile
      console.log('🔐 Using user login method...');
      
      try {
        const result = await generateUserOwnProfilePDF(userEmail, userPassword);
        pdfBuffer = result.pdfBuffer;
        profileUrl = result.profileUrl;
        
        console.log('✅ Successfully logged in to user account:', userEmail);
      } catch (error) {
        // Check if we should fallback to bot account
        if (error.message === 'FALLBACK_TO_BOT') {
          console.log('🔄 Falling back to bot account method...');
          console.log('📋 Using profile URL:', profileUrl || 'https://www.linkedin.com/in/me/');
          
          // Show URL form to frontend
          requestStore.set(requestId, { 
            status: 'failed', 
            message: 'Could not find Resources button. Please provide your LinkedIn profile URL to continue.',
            loginMethod: 'user',
            needsUrl: true
          });
          
          throw new Error('Could not find Resources or Save to PDF button on your profile. Please use the URL method below and provide your profile link.');
        } else {
          // Re-throw other errors
          throw error;
        }
      }
    } else {
      // Bot account method - download any profile by URL
      console.log('🤖 Using bot account method...');
      pdfBuffer = await generateLinkedInPDF(linkedinUrl);
    }
    
    // Update status
    requestStore.set(requestId, { 
      status: 'sending_email', 
      message: 'Sending email...',
      loginMethod
    });
    
    // Extract name from URL for filename
    const profileName = profileUrl.split('/in/')[1]?.split('/')[0] || 'profile';
    
    console.log('📧 Sending email...');
    
    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: emailAddress,
      subject: 'Your LinkedIn Profile PDF',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0077b5;">LinkedIn Profile PDF</h2>
          <p>Here is the LinkedIn profile PDF you requested:</p>
          <p><a href="${profileUrl}" style="color: #0077b5;">${profileUrl}</a></p>
          ${loginMethod === 'user' ? '<p><strong>Successfully logged in to your LinkedIn account!</strong></p>' : ''}
          <p>The PDF is attached to this email.</p>
          <br>
          <hr style="border: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply.</p>
        </div>
      `,
      attachments: [
        {
          filename: `linkedin-${profileName}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
    
    console.log(`✅ PDF sent successfully to: ${emailAddress}`);
    requestStore.set(requestId, { 
      status: 'completed', 
      message: `PDF sent to ${emailAddress}`,
      completedAt: new Date(),
      loginMethod
    });
    
  } catch (error) {
    console.error('❌ Error processing request:', error.message);
    requestStore.set(requestId, { 
      status: 'failed', 
      message: error.message,
      error: error.toString(),
      loginMethod: loginMethod || 'bot'
    });
    
    // Send error email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: emailAddress,
        subject: 'LinkedIn Profile PDF - Error',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Error Processing Your Request</h2>
            <p>We encountered an error while processing your LinkedIn profile PDF request:</p>
            ${linkedinUrl ? `<p><strong>Profile URL:</strong> ${linkedinUrl}</p>` : ''}
            ${userEmail ? `<p><strong>Login Email:</strong> ${userEmail}</p>` : ''}
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please try again or contact support if the issue persists.</p>
            ${loginMethod === 'user' ? '<p><em>Tip: If login failed, you can try using the profile URL method instead.</em></p>' : ''}
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send error email:', emailError);
    }
  } finally {
    activeRequestsCount--;
    console.log(`✅ Request ${requestId} completed. Active requests: ${activeRequestsCount}`);
  }
}

// API Endpoints

// User login and download their own profile
app.post('/api/user-login-download', async (req, res) => {
  const { userEmail, userPassword, emailAddress } = req.body;

  // Validation
  if (!userEmail || !userPassword || !emailAddress) {
    return res.status(400).json({ 
      error: 'LinkedIn email, password, and delivery email address are required' 
    });
  }

  // Email validation for delivery address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailAddress)) {
    return res.status(400).json({ 
      error: 'Invalid email address for PDF delivery' 
    });
  }

  // Generate unique request ID
  const requestId = `req_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store request
  requestStore.set(requestId, {
    status: 'logging_in',
    message: 'Logging in and preparing to download your profile',
    userEmail,
    emailAddress,
    loginMethod: 'user',
    createdAt: new Date()
  });
  
  // Process request immediately in background (parallel processing)
  const job = { 
    requestId, 
    userEmail, 
    userPassword, 
    emailAddress, 
    loginMethod: 'user' 
  };
  
  // Start processing without waiting (fire and forget)
  processRequest(job).catch(err => {
    console.error(`Error in background processing for ${requestId}:`, err);
  });
  
  console.log(`\n✨ New user login request: ${requestId}`);
  console.log(`🚀 Processing started immediately (parallel mode)`);
  
  res.json({ 
    requestId,
    status: 'logging_in',
    message: 'Logging in to your LinkedIn account'
  });
});

// Submit new request (bot account method)
app.post('/api/download-profile', async (req, res) => {
  const { linkedinUrl, emailAddress } = req.body;

  // Validation
  if (!linkedinUrl || !emailAddress) {
    return res.status(400).json({ 
      error: 'LinkedIn URL and email address are required' 
    });
  }
  
  if (!linkedinUrl.includes('linkedin.com/in/')) {
    return res.status(400).json({ 
      error: 'Invalid LinkedIn profile URL. Must be in format: https://www.linkedin.com/in/username' 
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailAddress)) {
    return res.status(400).json({ 
      error: 'Invalid email address' 
    });
  }

  // Generate unique request ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store request
  requestStore.set(requestId, {
    status: 'generating_pdf',
    message: 'Generating PDF...',
    linkedinUrl,
    emailAddress,
    createdAt: new Date()
  });
  
  // Process request immediately in background (parallel processing)
  const job = { requestId, linkedinUrl, emailAddress };
  
  // Start processing without waiting (fire and forget)
  processRequest(job).catch(err => {
    console.error(`Error in background processing for ${requestId}:`, err);
  });
  
  console.log(`\n✨ New request received: ${requestId}`);
  console.log(`🚀 Processing started immediately (parallel mode)`);
  
  res.json({ 
    requestId,
    status: 'generating_pdf',
    message: 'Your request is being processed'
  });
});

// Check request status
app.get('/api/status/:requestId', (req, res) => {
  const { requestId } = req.params;
  const request = requestStore.get(requestId);
  
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  
  res.json(request);
});

// LinkedIn status check
app.get('/api/linkedin-status', async (req, res) => {
  try {
    const isReady = browserInstance && browserInstance.isConnected();
    
    res.json({
      loggedIn: isReady,
      account: process.env.LINKEDIN_EMAIL,
      message: isReady ? 'Connected to LinkedIn' : 'Not connected'
    });
  } catch (error) {
    res.json({
      loggedIn: false,
      account: process.env.LINKEDIN_EMAIL,
      message: 'Connection error'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    activeRequests: activeRequestsCount,
    timestamp: new Date().toISOString()
  });
});

// Clear session endpoint (use when LinkedIn blocks the account)
app.post('/api/clear-session', async (req, res) => {
  try {
    const cleared = await clearSession();
    res.json({
      success: cleared,
      message: cleared 
        ? 'Session cleared successfully. The next request will use a fresh login.' 
        : 'No session to clear or already cleared.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing session: ' + error.message
    });
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (browserInstance) {
    await browserInstance.close();
  }
  process.exit(0);
});

// Initialize LinkedIn session on startup
async function initializeLinkedInSession() {
  console.log('\n🔐 Initializing LinkedIn session...');
  
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    // Configure page to avoid detection
    await configurePage(page);
    
    // Ensure we're logged in
    await ensureLoggedIn(page);
    
    await page.close();
    console.log('✅ LinkedIn session initialized and ready!\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize LinkedIn session:', error.message);
    console.error('⚠️  The app will try to login when processing requests.\n');
    return false;
  }
}

// Verify Gmail authentication on startup
async function verifyGmailConnection() {
  console.log('📧 Verifying Gmail connection...');
  
  try {
    // Verify the transporter configuration
    await transporter.verify();
    console.log('✅ Gmail authentication successful!');
    console.log(`   Connected to: ${process.env.EMAIL_USER}\n`);
    return true;
  } catch (error) {
    console.error('❌ Gmail authentication failed:', error.message);
    console.error('⚠️  Please check your EMAIL_USER and EMAIL_PASSWORD in .env file');
    console.error('⚠️  Make sure you are using a Gmail App Password, not your regular password\n');
    return false;
  }
}

app.listen(PORT, async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 LinkedIn PDF Downloader Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER || 'NOT CONFIGURED'}`);
  console.log(`👤 LinkedIn: ${process.env.LINKEDIN_EMAIL || 'NOT CONFIGURED'}`);
  console.log('='.repeat(60) + '\n');
  
  // Validate configuration
  if (!process.env.LINKEDIN_EMAIL || !process.env.LINKEDIN_PASSWORD) {
    console.warn('⚠️  WARNING: LinkedIn credentials not configured!');
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  WARNING: Email credentials not configured!');
  }
  
  // Verify Gmail connection first
  await verifyGmailConnection();
  
  // Skip LinkedIn initialization on startup - it will initialize when first request comes in
  console.log('ℹ️  Skipping LinkedIn browser initialization on startup.');
  console.log('   Browser will launch when first request is processed.\n');
});
