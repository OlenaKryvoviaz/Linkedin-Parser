const express = require('express');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

let browserInstance = null;
let isLoggedIn = false;

// Get browser instance
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  return browserInstance;
}

// Check LinkedIn login status
async function checkLinkedInLogin() {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.type('#username', process.env.LINKEDIN_EMAIL);
    await page.type('#password', process.env.LINKEDIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await delay(5000);
    
    const url = page.url();
    isLoggedIn = url.includes('/feed') || !url.includes('/login');
    
    await page.close();
    return isLoggedIn;
  } catch (error) {
    console.error('Login check failed:', error.message);
    isLoggedIn = false;
    return false;
  }
}

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    loggedIn: isLoggedIn,
    account: process.env.LINKEDIN_EMAIL
  });
});

// Force logout and clear cookies endpoint
app.post('/api/clear-cookies', async (req, res) => {
  try {
    // Close browser if open
    if (browserInstance) {
      await browserInstance.close();
      browserInstance = null;
    }
    
    // Delete cookie file if exists
    const cookiePath = path.join(__dirname, 'linkedin-cookies.json');
    try {
      await fs.unlink(cookiePath);
      console.log('✓ Cookies cleared');
    } catch (err) {
      // File doesn't exist, that's ok
    }
    
    isLoggedIn = false;
    
    // Re-check login
    await checkLinkedInLogin();
    
    res.json({ 
      success: true, 
      message: 'Cookies cleared and re-logged in',
      loggedIn: isLoggedIn
    });
  } catch (error) {
    console.error('Error clearing cookies:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate PDF from LinkedIn profile using native "Save to PDF"
async function generateLinkedInPDF(profileUrl) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Set up download path
    const downloadPath = path.join(__dirname, 'downloads');
    await fs.mkdir(downloadPath, { recursive: true }).catch(() => {});
    
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Step 1: Logging in to LinkedIn (bot account)...');
    // Login is already done at startup, but ensure we're logged in
    if (!isLoggedIn) {
      await checkLinkedInLogin();
    }
    console.log('✓ Logged in as:', process.env.LINKEDIN_EMAIL);
    
    console.log('Step 2: Navigating to profile:', profileUrl);
    
    // Try navigation with retries
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(profileUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 45000 
        });
        console.log('✓ Profile page loaded');
        break;
      } catch (error) {
        if (attempt === 3) throw new Error(`Failed to load profile: ${error.message}`);
        console.log(`Retry ${attempt}/3...`);
        await delay(2000);
      }
    }
    
    // Wait for page to fully load
    await delay(5000);
    
    // Screenshot 1: Profile page loaded
    const screenshotsPath = path.join(__dirname, 'screenshots');
    await fs.mkdir(screenshotsPath, { recursive: true }).catch(() => {});
    
    await page.screenshot({ 
      path: path.join(screenshotsPath, '1-profile-loaded.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot saved: 1-profile-loaded.png');
    
    console.log('Step 3: Looking for "More" button...');
    
    // More specific approach - find the "More" button by text
    let moreClicked = false;
    
    try {
      // Wait for the button to be present
      await page.waitForSelector('button', { timeout: 5000 });
      
      // Find and click the "More" button by text content
      moreClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const moreButton = buttons.find(btn => {
          const text = btn.textContent?.trim();
          return text === 'More' || text?.toLowerCase() === 'more';
        });
        
        if (moreButton) {
          moreButton.click();
          console.log('Found and clicked More button');
          return true;
        }
        return false;
      });
      
      if (moreClicked) {
        console.log('✓ Clicked "More" button');
      }
    } catch (e) {
      console.log('⚠️ Error finding More button:', e.message);
    }
    
    // Fallback: try aria-label selectors
    if (!moreClicked) {
      const moreButtonSelectors = [
        'button[aria-label*="More"]',
        'button[aria-label*="more"]',
        '.pvs-overflow-actions-dropdown__trigger'
      ];
      
      for (const selector of moreButtonSelectors) {
        try {
          await page.click(selector, { timeout: 3000 });
          console.log('✓ Clicked "More" button (via selector)');
          moreClicked = true;
          break;
        } catch (e) {
          console.log(`⚠️ Selector ${selector} not found`);
        }
      }
    }
    
    if (!moreClicked) {
      await page.screenshot({ 
        path: path.join(screenshotsPath, '2-more-button-not-found.png'),
        fullPage: true 
      });
      throw new Error('Could not find "More" button on profile. Check screenshot: 2-more-button-not-found.png');
    }
    
    // Wait for dropdown menu
    await delay(2000);
    
    // Screenshot 2: Dropdown menu opened
    await page.screenshot({ 
      path: path.join(screenshotsPath, '3-dropdown-menu-opened.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot saved: 3-dropdown-menu-opened.png');
    
    console.log('Step 4: Using keyboard to select "Save to PDF"...');
    
    // Set up download promise before clicking
    const downloadPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Download timeout')), 30000);
      
      const checkDownload = async () => {
        try {
          const files = await fs.readdir(downloadPath);
          const pdfFiles = files.filter(f => f.endsWith('.pdf'));
          if (pdfFiles.length > 0) {
            clearTimeout(timeout);
            clearInterval(interval);
            resolve(pdfFiles[pdfFiles.length - 1]);
          }
        } catch (e) {}
      };
      
      const interval = setInterval(checkDownload, 1000);
    });
    
    // Use keyboard navigation - more reliable than clicking
    // The dropdown menu should be open from the previous step
    // Menu items in order: Send profile in a message, Save to PDF, Follow, Report/Block, About this profile
    
    console.log('Using keyboard: Arrow Down to "Save to PDF"...');
    await page.keyboard.press('ArrowDown'); // Move to first item (Send profile)
    await delay(300);
    await page.keyboard.press('ArrowDown'); // Move to second item (Save to PDF)
    await delay(300);
    
    console.log('Pressing Enter to select "Save to PDF"...');
    await page.keyboard.press('Enter');
    await delay(1000);
    console.log('✓ Pressed Enter on "Save to PDF"')
    
    console.log('✓ Clicked "Save to PDF"');
    
    // Screenshot 3: After clicking Save to PDF
    await delay(1000);
    await page.screenshot({ 
      path: path.join(screenshotsPath, '5-after-pdf-click.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot saved: 5-after-pdf-click.png');
    
    console.log('⏳ Waiting for LinkedIn to generate and download PDF...');
    
    // Wait for download to complete
    let pdfFile;
    try {
      pdfFile = await downloadPromise;
      console.log('✓ PDF downloaded:', pdfFile);
    } catch (error) {
      // Check if file exists anyway
      const files = await fs.readdir(downloadPath);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));
      
      if (pdfFiles.length === 0) {
        console.log('Files in download folder:', files);
        await page.screenshot({ 
          path: path.join(screenshotsPath, '6-pdf-not-downloaded.png'),
          fullPage: true 
        });
        throw new Error('PDF was not downloaded. Check screenshots folder. LinkedIn may have changed their interface.');
      }
      pdfFile = pdfFiles[pdfFiles.length - 1];
    }
    
    const pdfPath = path.join(downloadPath, pdfFile);
    
    // Read the PDF file
    const pdfBuffer = await fs.readFile(pdfPath);
    
    // Clean up - delete the file
    await fs.unlink(pdfPath);
    
    console.log('Step 5: PDF ready to send via email');
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await page.close();
  }
}

// API endpoint
app.post('/api/download-profile', async (req, res) => {
  const { linkedinUrl, emailAddress } = req.body;

  if (!linkedinUrl || !emailAddress) {
    return res.status(400).json({ 
      error: 'LinkedIn URL and email address are required' 
    });
  }

  try {
    // Generate PDF
    const pdfBuffer = await generateLinkedInPDF(linkedinUrl);
    
    const profileName = linkedinUrl.split('/in/')[1]?.split('/')[0] || 'profile';
    
    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: emailAddress,
      subject: 'LinkedIn Profile PDF',
      html: `<p>Here is the LinkedIn profile PDF you requested:</p><p><a href="${linkedinUrl}">${linkedinUrl}</a></p>`,
      attachments: [{
        filename: `linkedin-${profileName}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
    
    res.json({ 
      success: true,
      message: `PDF sent to ${emailAddress}`
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Checking LinkedIn login...');
  await checkLinkedInLogin();
  console.log(isLoggedIn ? '✓ Logged in to LinkedIn' : '✗ Not logged in to LinkedIn');
});
