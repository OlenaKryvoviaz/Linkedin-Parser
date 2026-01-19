# Quick Start Deployment Guide

This is a quick reference guide for deploying the LinkedIn PDF Downloader to production.

## 🚀 Fastest Deployment Method (Docker)

### Prerequisites
- Server with Docker and Docker Compose installed
- LinkedIn corporate account credentials
- Gmail account with App Password

### Steps

1. **Clone/Upload the project to your server:**
```bash
cd /opt
git clone <your-repo-url> linkedin-pdf-downloader
cd linkedin-pdf-downloader
```

2. **Create and configure .env file:**
```bash
cp .env.example .env
nano .env
```

Add your credentials:
```env
LINKEDIN_EMAIL=your-corporate-linkedin@company.com
LINKEDIN_PASSWORD=your-password
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
PORT=3000
NODE_ENV=production
```

3. **Build and start the container:**
```bash
docker-compose up -d --build
```

4. **Verify it's running:**
```bash
docker-compose ps
docker-compose logs -f
```

5. **Test the application:**
```bash
curl http://localhost:3000/api/health
```

6. **Access via browser:**
```
http://your-server-ip:3000
```

**Done! 🎉**

---

## 📋 Management Commands

### View logs
```bash
docker-compose logs -f
```

### Restart application
```bash
docker-compose restart
```

### Stop application
```bash
docker-compose down
```

### Update application
```bash
git pull
docker-compose up -d --build
```

### Clear LinkedIn session (if blocked)
```bash
docker-compose exec linkedin-pdf-downloader npm run clear-session
```

---

## 🔒 Security Setup (Recommended)

### 1. Set up firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

### 2. Install Nginx (optional, for HTTPS)
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config from nginx.conf.example
sudo cp nginx.conf.example /etc/nginx/sites-available/linkedin-pdf-downloader
sudo ln -s /etc/nginx/sites-available/linkedin-pdf-downloader /etc/nginx/sites-enabled/

# Edit config with your domain
sudo nano /etc/nginx/sites-available/linkedin-pdf-downloader

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔍 Monitoring

### Check application health
```bash
curl http://localhost:3000/api/health
```

### Check LinkedIn status
```bash
curl http://localhost:3000/api/linkedin-status
```

### Monitor resources
```bash
docker stats linkedin-pdf-downloader
```

---

## ⚠️ Important Notes

1. **LinkedIn Rate Limits:**
   - Maximum 10-15 profiles per hour
   - Maximum 50 profiles per day
   - Built-in 20-second delay between requests

2. **Account Security:**
   - Use dedicated corporate LinkedIn account
   - Never use personal LinkedIn account
   - Enable 2FA on both LinkedIn and Gmail

3. **IP Blocking:**
   - If LinkedIn blocks your IP, clear session: `npm run clear-session`
   - Wait 30 minutes before trying again
   - Consider using different IP (VPN, mobile hotspot)

4. **Backup Important Files:**
   - `.env` (credentials)
   - `linkedin-cookies.json` (session)

---

## 📚 Full Documentation

For complete deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For production checklist, see [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)

For troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Need Help?**

1. Check logs: `docker-compose logs -f`
2. Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Verify credentials in `.env`
4. Ensure LinkedIn account is not locked
