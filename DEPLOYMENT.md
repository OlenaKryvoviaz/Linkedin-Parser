# Deployment Guide

This guide covers different deployment options for the LinkedIn PDF Downloader application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Options](#deployment-options)
  - [Option 1: Docker Deployment (Recommended)](#option-1-docker-deployment-recommended)
  - [Option 2: Traditional Server Deployment](#option-2-traditional-server-deployment)
  - [Option 3: Cloud Platform Deployment](#option-3-cloud-platform-deployment)
- [Production Considerations](#production-considerations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

1. **LinkedIn Corporate Account** (dedicated, not personal)
2. **Gmail Account** with App Password enabled
3. **Server/VPS** with:
   - Minimum 2GB RAM
   - 2 CPU cores
   - 20GB storage
   - Ubuntu 20.04+ or similar Linux distribution

## Environment Configuration

### Step 1: Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### Step 2: Configure Credentials

Edit `.env` with your actual credentials:

```env
# LinkedIn Credentials (Corporate Account)
LINKEDIN_EMAIL=your-corporate-linkedin@company.com
LINKEDIN_PASSWORD=your-secure-password

# Gmail Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password

# Server Configuration
PORT=3000
NODE_ENV=production
```

### Step 3: Secure Your Environment File

```bash
chmod 600 .env
```

**⚠️ IMPORTANT:** Never commit `.env` to version control!

---

## Deployment Options

### Option 1: Docker Deployment (Recommended)

Docker provides the easiest and most reliable deployment method.

#### Prerequisites

Install Docker and Docker Compose:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Deploy with Docker Compose

1. **Build and start the container:**

```bash
docker-compose up -d --build
```

2. **Check status:**

```bash
docker-compose ps
docker-compose logs -f
```

3. **Access the application:**

Open your browser to `http://your-server-ip:3000`

#### Docker Management Commands

```bash
# Stop the application
docker-compose down

# Restart the application
docker-compose restart

# View logs
docker-compose logs -f linkedin-pdf-downloader

# Update the application
git pull
docker-compose up -d --build

# Clear session (when LinkedIn blocks)
docker-compose exec linkedin-pdf-downloader npm run clear-session
```

---

### Option 2: Traditional Server Deployment

For deployment without Docker on Ubuntu/Debian servers.

#### Step 1: Install Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Step 2: Install Chrome and Dependencies

```bash
# Add Google Chrome repository
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google.list

# Install Chrome
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Install additional dependencies
sudo apt-get install -y fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils
```

#### Step 3: Deploy Application

```bash
# Clone or upload your application
cd /opt
sudo mkdir -p linkedin-pdf-downloader
sudo chown $USER:$USER linkedin-pdf-downloader
cd linkedin-pdf-downloader

# Install dependencies
npm ci --only=production

# Set up environment
cp .env.example .env
nano .env  # Edit with your credentials
```

#### Step 4: Set Up PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start server.js --name linkedin-pdf-downloader

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions from the output
```

#### PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs linkedin-pdf-downloader

# Restart application
pm2 restart linkedin-pdf-downloader

# Stop application
pm2 stop linkedin-pdf-downloader

# Monitor resources
pm2 monit
```

---

### Option 3: Cloud Platform Deployment

#### AWS EC2 Deployment

1. **Launch EC2 Instance:**
   - Instance type: t3.medium (minimum)
   - OS: Ubuntu 20.04 LTS
   - Storage: 20GB GP2
   - Security group: Allow inbound on port 3000

2. **Connect and deploy:**

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
sudo apt update && sudo apt upgrade -y
# Follow "Option 2: Traditional Server Deployment" steps above
```

3. **Set up reverse proxy with Nginx (optional):**

```bash
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/linkedin-pdf-downloader
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/linkedin-pdf-downloader /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### DigitalOcean Droplet

Similar to AWS EC2, but with DigitalOcean interface:

1. Create a Droplet (2GB RAM minimum)
2. Choose Ubuntu 20.04
3. SSH into droplet and follow deployment steps

#### Google Cloud Platform (GCP)

1. Create a Compute Engine instance
2. Configure firewall rules for port 3000
3. SSH and deploy using traditional method

---

## Production Considerations

### Security Best Practices

1. **Firewall Configuration:**

```bash
# UFW (Ubuntu Firewall)
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 3000/tcp   # Application (or 80/443 if using Nginx)
sudo ufw enable
```

2. **Use HTTPS with SSL/TLS:**

Install Certbot for Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

3. **Secure sensitive files:**

```bash
chmod 600 .env
chmod 600 linkedin-cookies.json
```

4. **Regular security updates:**

```bash
sudo apt update && sudo apt upgrade -y
```

### Performance Optimization

1. **Increase Node.js memory limit (if needed):**

```bash
# For PM2
pm2 start server.js --name linkedin-pdf-downloader --max-memory-restart 1G

# For Docker, edit docker-compose.yml memory limits
```

2. **Enable swap (if RAM is limited):**

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Rate Limiting

LinkedIn may block your account if you exceed:
- **10-15 profiles per hour**
- **50 profiles per day**

Current implementation has built-in delays between requests.

### Backup Strategy

```bash
# Backup session cookies
cp linkedin-cookies.json linkedin-cookies.json.backup

# Backup environment
cp .env .env.backup
```

---

## Monitoring and Maintenance

### Health Monitoring

1. **Application health endpoint:**

```bash
curl http://localhost:3000/api/health
```

2. **Check LinkedIn session status:**

```bash
curl http://localhost:3000/api/linkedin-status
```

### Log Management

#### Docker Logs

```bash
docker-compose logs -f --tail=100 linkedin-pdf-downloader
```

#### PM2 Logs

```bash
pm2 logs linkedin-pdf-downloader --lines 100
```

### Automated Monitoring (Optional)

Set up a cron job to monitor health:

```bash
crontab -e
```

Add:

```cron
*/5 * * * * curl -f http://localhost:3000/api/health || echo "Health check failed" | mail -s "LinkedIn PDF Downloader Down" your-email@example.com
```

---

## Troubleshooting

### Common Issues

#### 1. LinkedIn Blocking (GraphQL Error)

**Solution:**

```bash
# Clear session
npm run clear-session  # or
docker-compose exec linkedin-pdf-downloader npm run clear-session

# Wait 30 minutes
# Try from different IP address (VPN/mobile hotspot)
```

#### 2. Chrome Won't Start in Docker

**Solution:**

Ensure `--no-sandbox` flag is set and security options are configured in docker-compose.yml:

```yaml
security_opt:
  - seccomp:unconfined
```

#### 3. Out of Memory Errors

**Solution:**

```bash
# Increase Docker memory limit
# Edit docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 4G
```

#### 4. Email Not Sending

**Checklist:**
- Verify EMAIL_USER and EMAIL_PASSWORD in `.env`
- Ensure using Gmail App Password (not regular password)
- Check 2-Step Verification is enabled on Google Account

#### 5. Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000
# Kill the process or change PORT in .env
```

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `LINKEDIN_EMAIL` | Yes | LinkedIn corporate account email | `bot@company.com` |
| `LINKEDIN_PASSWORD` | Yes | LinkedIn account password | `SecurePass123!` |
| `EMAIL_USER` | Yes | Gmail address for sending PDFs | `sender@gmail.com` |
| `EMAIL_PASSWORD` | Yes | Gmail App Password (16 chars) | `abcd efgh ijkl mnop` |
| `PORT` | No | Server port (default: 3000) | `3000` |
| `NODE_ENV` | No | Environment (production/development) | `production` |

---

## Support and Resources

- **GitHub Issues:** Report bugs and issues
- **Documentation:** See [README.md](./README.md) for usage
- **Troubleshooting:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Maintenance Schedule

Recommended maintenance tasks:

- **Daily:** Check logs for errors
- **Weekly:** Verify LinkedIn session is active
- **Monthly:** Review and rotate credentials if needed
- **Quarterly:** Update dependencies and security patches

---

**Last Updated:** January 2026

**License:** MIT
