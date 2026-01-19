# LinkedIn Profile PDF Downloader

An automated web application that downloads LinkedIn profiles as PDFs and emails them to users. Built with Node.js, Puppeteer, and Express.

![LinkedIn PDF Downloader](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)

## 🚀 Features

- ✅ Automated LinkedIn profile PDF generation
- ✅ Email delivery with PDF attachment
- ✅ Queue system for handling multiple requests
- ✅ Session persistence (login once, reuse session)
- ✅ Real-time status updates
- ✅ Rate limiting to avoid detection
- ✅ Beautiful responsive UI
- ✅ Error handling and user notifications

## 📋 Prerequisites

Before you begin, you'll need:

1. **Node.js** (v16 or higher)
2. **LinkedIn Corporate Account** (dedicated account, not personal)
3. **Gmail Account** with App Password enabled

## 🛠️ Installation

### Step 1: Clone or Download the Project

```bash
cd "Linkedin parser"
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `puppeteer` - Browser automation
- `nodemailer` - Email sending
- `dotenv` - Environment variables
- `cors` - Cross-origin requests

### Step 3: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```env
# LinkedIn Credentials (Corporate Account)
LINKEDIN_EMAIL=your-corporate-linkedin@company.com
LINKEDIN_PASSWORD=your-secure-password

# Gmail Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password

# Server Configuration (optional)
PORT=3000
```

### Step 4: Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Go to **App Passwords**: https://myaccount.google.com/apppasswords
4. Select **Mail** and **Other (Custom name)**
5. Copy the 16-character password
6. Paste it into your `.env` file as `EMAIL_PASSWORD`

## 🎯 Usage

### Start the Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

You should see:

```
============================================================
🚀 LinkedIn PDF Downloader Server Started
============================================================
📡 Server: http://localhost:3000
📧 Email: your-email@gmail.com
👤 LinkedIn: your-corporate-linkedin@company.com
============================================================
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### How to Use

1. **Enter LinkedIn Profile URL**
   - Example: `https://www.linkedin.com/in/john-doe`
   
2. **Enter Email Address**
   - The email where you want to receive the PDF
   
3. **Click "Download & Send PDF"**
   - The system will queue your request
   - You'll see real-time status updates
   - PDF will be emailed to you when ready

## 📊 API Endpoints

### POST `/api/download-profile`
Submit a new PDF download request

**Request Body:**
```json
{
  "linkedinUrl": "https://www.linkedin.com/in/username",
  "emailAddress": "user@example.com"
}
```

**Response:**
```json
{
  "requestId": "req_1234567890_abc123",
  "status": "queued",
  "message": "Your request has been queued for processing",
  "queuePosition": 1
}
```

### GET `/api/status/:requestId`
Check the status of a request

**Response:**
```json
{
  "status": "completed",
  "message": "PDF sent to user@example.com",
  "completedAt": "2026-01-17T12:34:56.789Z"
}
```

### GET `/api/health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "queueLength": 0,
  "processing": false,
  "timestamp": "2026-01-17T12:34:56.789Z"
}
```

## ⚙️ Configuration

### Rate Limiting

The system processes requests with a 20-second delay between each to avoid LinkedIn detection. You can adjust this in `server.js`:

```javascript
setTimeout(() => processQueue(), 20000); // Change 20000 to desired milliseconds
```

### PDF Settings

Customize PDF generation in the `generateLinkedInPDF` function:

```javascript
const pdfBuffer = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: {
    top: '10mm',
    right: '10mm',
    bottom: '10mm',
    left: '10mm'
  }
});
```

## 🔒 Security Notes

### ⚠️ Important Warnings

1. **LinkedIn Terms of Service**
   - Automated scraping violates LinkedIn's TOS
   - Use at your own risk
   - Consider LinkedIn's Official API for production

2. **Account Protection**
   - Use a dedicated corporate account, NOT your personal LinkedIn
   - LinkedIn may ban accounts that appear to be bots
   - Keep requests under 10-15 profiles per hour

3. **Credentials Security**
   - Never commit `.env` file to version control
   - Use strong passwords
   - Rotate credentials regularly
   - Consider using a secrets manager for production

## 🐛 Troubleshooting

### ⚠️ Issue: "GraphQL Invalid Server Response Error" (MOST COMMON)

**This error means LinkedIn is blocking automated access.** 

**Quick Fix:**
```bash
# 1. Clear the blocked session
npm run clear-session

# 2. Test your connection
npm run test-session

# 3. If still blocked, wait 30 minutes and try again
```

**Detailed Solutions:**
1. **Clear cookies and restart:**
   ```bash
   npm run clear-session
   npm start
   ```

2. **Use a different IP address** (most reliable):
   - Switch to mobile hotspot
   - Use different WiFi network
   - Consider residential proxy

3. **Reduce request frequency:**
   - Wait 5-10 minutes between profiles
   - Never exceed 10 profiles per hour

4. **Manual verification:**
   - The browser window will stay open
   - Log in manually if prompted
   - Complete any security challenges

📖 **For comprehensive troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

---

### Issue: "LinkedIn security challenge detected"
**Solution:** 
- Log into the LinkedIn account manually from the same IP
- Complete any verification challenges
- Wait 24 hours before trying automation

### Issue: "Failed to send email"
**Solution:**
- Verify Gmail App Password is correct (16 characters, no spaces)
- Ensure 2-Step Verification is enabled on Google Account
- Check if "Less secure app access" is turned off (use App Passwords instead)

### Issue: Browser won't start
**Solution:**
```bash
# Reinstall Puppeteer
npm uninstall puppeteer puppeteer-extra
npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
```

### Issue: PDF is incomplete
**Solution:**
- Increase wait time in `autoScroll` function
- Add delays before PDF generation
- Check LinkedIn's page structure hasn't changed

## 📁 Project Structure

```
Linkedin parser/
├── server.js              # Main backend server
├── public/
│   └── index.html         # Frontend interface
├── package.json           # Dependencies
├── .env                   # Environment variables (create from .env.example)
├── .env.example           # Environment template
├── .gitignore            # Git ignore rules
├── linkedin-cookies.json  # Session cookies (auto-generated)
└── README.md             # This file
```

## 🚦 Status Flow

```
Queued → Generating PDF → Sending Email → Completed
                                        ↓
                                      Failed
```

## 📝 Logs

The server provides detailed console logs:

```
🚀 Launching new browser instance...
🔐 Checking LinkedIn session...
✅ Already logged in with saved session
🔍 Navigating to profile: https://www.linkedin.com/in/...
📜 Scrolling to load all sections...
📄 Generating PDF...
✅ PDF generated successfully
📧 Sending email...
✅ PDF sent successfully to: user@example.com
```

## 🎨 Customization

### Change UI Colors

Edit `public/index.html`, find the gradient:

```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Email Template

Edit the email HTML in `server.js`:

```javascript
await transporter.sendMail({
  subject: 'Your LinkedIn Profile PDF',
  html: `<!-- Your custom HTML here -->`
});
```

## 🤝 Contributing

This is a personal/internal project. For improvements:
1. Test changes thoroughly
2. Update documentation
3. Consider LinkedIn's rate limits

## 📄 License

MIT License - Use at your own risk

## ⚖️ Legal Disclaimer

This tool is for educational and internal business purposes only. Users are responsible for:
- Complying with LinkedIn's Terms of Service
- Respecting data privacy laws (GDPR, CCPA, etc.)
- Obtaining necessary permissions
- Any consequences of automated access

## 🆘 Support

For issues:
1. Check the Troubleshooting section
2. Review server logs
3. Verify all credentials are correct
4. Ensure LinkedIn account is not locked

## 🔮 Future Enhancements

Potential improvements:
- [ ] Database for request history
- [ ] User authentication
- [ ] Batch processing
- [ ] Proxy rotation
- [ ] LinkedIn Official API integration
- [ ] Docker containerization
- [ ] Admin dashboard

---

**Built with ❤️ using Node.js, Puppeteer, and Express**
