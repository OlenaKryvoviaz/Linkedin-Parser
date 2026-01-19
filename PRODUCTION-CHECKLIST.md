# Production Deployment Checklist

Use this checklist to ensure your deployment is production-ready and secure.

## Pre-Deployment

### Configuration

- [ ] `.env` file created and configured with production credentials
- [ ] `LINKEDIN_EMAIL` set to dedicated corporate account (not personal)
- [ ] `LINKEDIN_PASSWORD` is strong and secure
- [ ] `EMAIL_USER` configured with Gmail account
- [ ] `EMAIL_PASSWORD` set to Gmail App Password (16 characters)
- [ ] `NODE_ENV=production` set in environment
- [ ] `PORT` configured (default: 3000)
- [ ] `.env` file permissions set to 600 (`chmod 600 .env`)

### Security

- [ ] `.env` is in `.gitignore` and NOT committed to version control
- [ ] LinkedIn account has 2-Factor Authentication enabled
- [ ] Gmail account has 2-Factor Authentication enabled
- [ ] Using Gmail App Password (not regular password)
- [ ] Reviewed and understood LinkedIn Terms of Service
- [ ] Dedicated corporate LinkedIn account (not personal account)
- [ ] Strong passwords for all accounts
- [ ] Regular password rotation schedule established

### Server/Infrastructure

- [ ] Server meets minimum requirements:
  - [ ] 2GB RAM minimum (4GB recommended)
  - [ ] 2 CPU cores
  - [ ] 20GB storage
  - [ ] Ubuntu 20.04+ or similar Linux distribution
- [ ] Server has public IP or domain name
- [ ] SSH access configured with key-based authentication
- [ ] Firewall configured (UFW or similar)
- [ ] SSL/TLS certificate obtained (Let's Encrypt recommended)
- [ ] Backup strategy in place

### Dependencies

- [ ] Node.js 18+ installed
- [ ] Google Chrome installed (or Docker with Chrome)
- [ ] npm dependencies installed with `npm ci --only=production`
- [ ] PM2 installed globally (if not using Docker): `npm install -g pm2`
- [ ] Docker and Docker Compose installed (if using Docker)

## Deployment

### Docker Deployment

- [ ] Dockerfile reviewed and customized if needed
- [ ] docker-compose.yml reviewed and customized
- [ ] `.dockerignore` configured properly
- [ ] Environment variables set in docker-compose.yml or .env
- [ ] Build Docker image: `docker-compose build`
- [ ] Start container: `docker-compose up -d`
- [ ] Verify container is running: `docker-compose ps`
- [ ] Check logs for errors: `docker-compose logs -f`
- [ ] Test health endpoint: `curl http://localhost:3000/api/health`

### Traditional Deployment (PM2)

- [ ] Application files uploaded to server
- [ ] Dependencies installed: `npm ci --only=production`
- [ ] PM2 configuration reviewed: `ecosystem.config.js`
- [ ] Start application: `pm2 start ecosystem.config.js --env production`
- [ ] Save PM2 configuration: `pm2 save`
- [ ] Configure PM2 to start on boot: `pm2 startup`
- [ ] Verify PM2 status: `pm2 status`
- [ ] Check logs: `pm2 logs linkedin-pdf-downloader`

### Nginx Configuration (if using reverse proxy)

- [ ] Nginx installed
- [ ] Nginx configuration file created from nginx.conf.example
- [ ] Domain name configured in nginx.conf
- [ ] SSL certificate paths configured
- [ ] Configuration tested: `sudo nginx -t`
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] Application accessible via domain name

## Post-Deployment

### Testing

- [ ] Application accessible via browser
- [ ] Health check endpoint working: `/api/health`
- [ ] LinkedIn status check working: `/api/linkedin-status`
- [ ] Test user login flow with your LinkedIn credentials
- [ ] Test profile URL download with bot account
- [ ] Verify email sending (test with your email)
- [ ] Test error handling (invalid URL, wrong credentials)
- [ ] Check PDF quality and completeness
- [ ] Verify session persistence (restart server, session should persist)

### Monitoring

- [ ] Health check endpoint monitored (manual or automated)
- [ ] Log rotation configured
- [ ] Disk space monitoring set up
- [ ] CPU and memory monitoring configured
- [ ] Alert system configured (email, Slack, etc.)
- [ ] Error logging reviewed
- [ ] Application metrics tracked (requests, success rate, errors)

### Security Hardening

- [ ] Firewall rules configured:
  - [ ] SSH port (22) allowed from trusted IPs only
  - [ ] Application port (3000) or HTTP/HTTPS (80/443) allowed
  - [ ] All other ports blocked
- [ ] SSL/TLS certificate installed and working
- [ ] HTTPS redirect configured (HTTP → HTTPS)
- [ ] Security headers configured in Nginx
- [ ] Rate limiting configured (optional but recommended)
- [ ] CORS configured properly (if needed)
- [ ] Unnecessary services disabled
- [ ] Regular security updates scheduled

### Backup

- [ ] Session cookies backed up: `linkedin-cookies.json`
- [ ] Environment file backed up: `.env` (securely!)
- [ ] Application code backed up
- [ ] Database backed up (if applicable)
- [ ] Backup restoration tested
- [ ] Automated backup schedule configured

### Documentation

- [ ] Deployment documented (server details, credentials location)
- [ ] Team members informed of deployment
- [ ] Access credentials shared securely (1Password, LastPass, etc.)
- [ ] Runbook created for common tasks
- [ ] Incident response plan documented
- [ ] Contact information for support updated

## Operational Readiness

### Maintenance

- [ ] Update schedule established:
  - [ ] npm dependencies
  - [ ] Node.js version
  - [ ] System packages
  - [ ] SSL certificates
- [ ] Session clearing procedure documented
- [ ] IP rotation strategy (if needed for LinkedIn blocking)
- [ ] Credential rotation schedule established

### Rate Limiting Compliance

- [ ] Rate limiting understood:
  - [ ] Maximum 10-15 profiles per hour
  - [ ] Maximum 50 profiles per day
  - [ ] 5-10 minute delays between requests
- [ ] Usage monitoring in place
- [ ] Alert configured for rate limit violations

### Support

- [ ] Support email/contact configured
- [ ] Troubleshooting guide accessible
- [ ] Team trained on common issues
- [ ] Escalation procedure defined
- [ ] On-call rotation established (if applicable)

## Legal and Compliance

- [ ] LinkedIn Terms of Service reviewed
- [ ] Privacy policy created (if collecting user data)
- [ ] GDPR compliance reviewed (if serving EU users)
- [ ] Data retention policy established
- [ ] User consent mechanisms implemented (if needed)
- [ ] Legal disclaimer added to application

## Performance

- [ ] Load testing performed
- [ ] Resource limits configured (memory, CPU)
- [ ] Caching strategy implemented (if needed)
- [ ] Database optimization done (if applicable)
- [ ] CDN configured for static assets (if needed)

## Disaster Recovery

- [ ] Backup restoration tested
- [ ] Failover procedure documented
- [ ] Rollback procedure tested
- [ ] Incident response plan created
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined

---

## Final Checks

- [ ] All critical items above completed
- [ ] Production environment tested end-to-end
- [ ] Team sign-off obtained
- [ ] Deployment announcement sent
- [ ] Monitoring dashboards reviewed
- [ ] First 24 hours: Monitor logs and metrics closely
- [ ] First week: Review error rates and performance
- [ ] First month: Analyze usage patterns and optimize

---

## Post-Launch Monitoring (First 7 Days)

### Daily Tasks

- [ ] Check application health: `curl http://your-domain.com/api/health`
- [ ] Review error logs
- [ ] Monitor resource usage (CPU, RAM, disk)
- [ ] Check LinkedIn session status
- [ ] Verify email sending is working
- [ ] Review successful PDF generations
- [ ] Monitor LinkedIn account for warnings/blocks

### Weekly Tasks

- [ ] Review and analyze error patterns
- [ ] Check for security updates
- [ ] Verify backups are working
- [ ] Review rate limiting compliance
- [ ] Update documentation with lessons learned
- [ ] Team retrospective on deployment

---

## Emergency Contacts

- **Server Provider:** _____________________
- **DNS Provider:** _____________________
- **SSL Certificate:** _____________________
- **Email Service:** Gmail
- **LinkedIn Account Owner:** _____________________
- **Primary On-Call:** _____________________
- **Secondary On-Call:** _____________________

---

## Notes

_(Add any deployment-specific notes, custom configurations, or special considerations here)_

---

**Deployment Date:** ___/___/______

**Deployed By:** _____________________

**Reviewed By:** _____________________

**Production URL:** _____________________

**Sign-off:**

- [ ] Technical Lead
- [ ] Security Officer
- [ ] Operations Manager
- [ ] Product Owner
