#!/bin/bash

# Deployment Validation Script
# Run this script before deploying to check if everything is configured correctly

set -e

echo "============================================================"
echo "🔍 LinkedIn PDF Downloader - Deployment Validation"
echo "============================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for issues
ERRORS=0
WARNINGS=0

# Helper functions
error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "ℹ️  $1"
}

echo "=== Checking Files ==="
echo ""

# Check if package.json exists
if [ -f "package.json" ]; then
    success "package.json found"
else
    error "package.json not found"
fi

# Check if server.js exists
if [ -f "server.js" ]; then
    success "server.js found"
else
    error "server.js not found"
fi

# Check if .env.example exists
if [ -f ".env.example" ]; then
    success ".env.example found"
else
    warning ".env.example not found"
fi

# Check if .env exists
if [ -f ".env" ]; then
    success ".env file found"
    
    # Validate .env contents
    echo ""
    info "Checking .env configuration..."
    
    if grep -q "LINKEDIN_EMAIL=" .env && ! grep -q "LINKEDIN_EMAIL=$" .env && ! grep -q "LINKEDIN_EMAIL=your-" .env; then
        success "LINKEDIN_EMAIL is configured"
    else
        error "LINKEDIN_EMAIL is not configured in .env"
    fi
    
    if grep -q "LINKEDIN_PASSWORD=" .env && ! grep -q "LINKEDIN_PASSWORD=$" .env && ! grep -q "LINKEDIN_PASSWORD=your-" .env; then
        success "LINKEDIN_PASSWORD is configured"
    else
        error "LINKEDIN_PASSWORD is not configured in .env"
    fi
    
    if grep -q "EMAIL_USER=" .env && ! grep -q "EMAIL_USER=$" .env && ! grep -q "EMAIL_USER=your-" .env; then
        success "EMAIL_USER is configured"
    else
        error "EMAIL_USER is not configured in .env"
    fi
    
    if grep -q "EMAIL_PASSWORD=" .env && ! grep -q "EMAIL_PASSWORD=$" .env && ! grep -q "EMAIL_PASSWORD=your-" .env; then
        success "EMAIL_PASSWORD is configured"
    else
        error "EMAIL_PASSWORD is not configured in .env"
    fi
    
else
    error ".env file not found - copy .env.example to .env and configure it"
fi

echo ""
echo "=== Checking Deployment Files ==="
echo ""

# Check Dockerfile
if [ -f "Dockerfile" ]; then
    success "Dockerfile found"
else
    warning "Dockerfile not found - Docker deployment won't work"
fi

# Check docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    success "docker-compose.yml found"
else
    warning "docker-compose.yml not found - Docker deployment won't work"
fi

# Check .dockerignore
if [ -f ".dockerignore" ]; then
    success ".dockerignore found"
else
    warning ".dockerignore not found - Docker build may include unnecessary files"
fi

# Check PM2 config
if [ -f "ecosystem.config.js" ]; then
    success "ecosystem.config.js found (PM2 configuration)"
else
    warning "ecosystem.config.js not found - PM2 deployment won't work"
fi

# Check nginx config example
if [ -f "nginx.conf.example" ]; then
    success "nginx.conf.example found"
else
    warning "nginx.conf.example not found - Nginx setup will be manual"
fi

echo ""
echo "=== Checking Dependencies ==="
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    success "node_modules directory found"
else
    warning "node_modules not found - run 'npm install'"
fi

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    success "Node.js is installed ($NODE_VERSION)"
    
    # Extract major version
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    
    if [ "$MAJOR_VERSION" -ge 16 ]; then
        success "Node.js version is compatible (>=16)"
    else
        error "Node.js version is too old. Required: >=16, Found: $NODE_VERSION"
    fi
else
    warning "Node.js not found on this system (needed for local deployment)"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    success "npm is installed ($NPM_VERSION)"
else
    warning "npm not found on this system"
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    success "Docker is installed ($DOCKER_VERSION)"
else
    warning "Docker not found on this system (needed for Docker deployment)"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    success "Docker Compose is installed ($COMPOSE_VERSION)"
else
    warning "Docker Compose not found on this system (needed for Docker deployment)"
fi

echo ""
echo "=== Checking Security ==="
echo ""

# Check .env permissions
if [ -f ".env" ]; then
    PERMISSIONS=$(stat -f "%A" .env 2>/dev/null || stat -c "%a" .env 2>/dev/null)
    if [ "$PERMISSIONS" = "600" ] || [ "$PERMISSIONS" = "400" ]; then
        success ".env file has secure permissions ($PERMISSIONS)"
    else
        warning ".env file permissions are too open ($PERMISSIONS) - should be 600"
        info "Run: chmod 600 .env"
    fi
fi

# Check if .env is in .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "^\.env$" .gitignore; then
        success ".env is in .gitignore"
    else
        error ".env is NOT in .gitignore - risk of committing credentials!"
        info "Add '.env' to .gitignore immediately"
    fi
fi

# Check if linkedin-cookies.json is in .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "linkedin-cookies.json" .gitignore; then
        success "linkedin-cookies.json is in .gitignore"
    else
        warning "linkedin-cookies.json should be in .gitignore"
    fi
fi

echo ""
echo "=== Checking Documentation ==="
echo ""

[ -f "README.md" ] && success "README.md found" || warning "README.md not found"
[ -f "DEPLOYMENT.md" ] && success "DEPLOYMENT.md found" || warning "DEPLOYMENT.md not found"
[ -f "PRODUCTION-CHECKLIST.md" ] && success "PRODUCTION-CHECKLIST.md found" || warning "PRODUCTION-CHECKLIST.md not found"
[ -f "QUICK-START-DEPLOY.md" ] && success "QUICK-START-DEPLOY.md found" || warning "QUICK-START-DEPLOY.md not found"

echo ""
echo "============================================================"
echo "📊 Validation Summary"
echo "============================================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Your project is ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review DEPLOYMENT.md for deployment instructions"
    echo "  2. Choose your deployment method (Docker or PM2)"
    echo "  3. Follow the deployment guide"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings found: $WARNINGS${NC}"
    echo ""
    echo "Your project can be deployed, but review the warnings above."
    echo ""
    exit 0
else
    echo -e "${RED}❌ Errors found: $ERRORS${NC}"
    echo -e "${YELLOW}⚠️  Warnings found: $WARNINGS${NC}"
    echo ""
    echo "Please fix the errors above before deploying."
    echo ""
    exit 1
fi
