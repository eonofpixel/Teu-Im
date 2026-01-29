# Teu-Im Deployment Guide

Complete instructions for deploying Teu-Im across different platforms: web app on Vercel, self-hosted servers, and desktop app builds.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Web App Deployment](#web-app-deployment)
  - [Vercel (Recommended)](#vercel-recommended)
  - [Self-Hosted](#self-hosted)
- [Desktop App Deployment](#desktop-app-deployment)
- [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

Before deploying Teu-Im, ensure you have:

### Required Software

- **Node.js**: v18.0.0 or higher
- **pnpm**: v10.28.1 (Teu-Im uses pnpm workspaces)
- **Git**: For cloning and version control

### Accounts and Services

- **Supabase Project**: Set up at https://supabase.com
  - Obtain project URL and API keys
  - Configure database with required tables (see [DATABASE.md](./DATABASE.md))
  - Enable Row Level Security (RLS) policies

- **For Web Deployment**:
  - Vercel account (recommended) OR server infrastructure
  - Custom domain name (optional but recommended)

- **For Desktop App**:
  - macOS: Xcode Command Line Tools installed (`xcode-select --install`)
  - Windows: Visual Studio Build Tools
  - Code signing certificate (for production releases)

### Project Access

- Repository access to Teu-Im source code
- Permissions to configure Vercel/server infrastructure
- Access to manage Supabase databases and API keys

---

## Environment Variables

All Teu-Im deployments require specific environment variables. See `.env.example` files in each app directory for templates.

### Web App Variables (`apps/web/.env.local`)

**Supabase (Required)**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Application URLs (Recommended)**
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Security (Optional)**
```
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Error Tracking (Optional)**
```
NEXT_PUBLIC_ERROR_ENDPOINT=https://your-error-tracking-endpoint.com/api/errors
```

### Desktop App Variables (`apps/desktop/.env`)

**Supabase (Required)**
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Web Backend (Required)**
```
VITE_API_BASE_URL=https://your-vercel-url.vercel.app
```

### Obtaining Supabase Credentials

1. Go to Supabase Dashboard for your project
2. Navigate to **Settings** → **API**
3. Copy values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` and `VITE_SUPABASE_URL`
   - `anon (public)` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (web app server-only, never expose)

**Security Note**: The `service_role` key provides full database access. Keep it secret and only use it in server-side environments.

---

## Web App Deployment

### Vercel (Recommended)

Vercel offers the easiest deployment path for Next.js applications with automatic scaling, built-in analytics, and seamless GitHub integration.

#### Step 1: Connect Repository to Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Select **Import Git Repository**
4. Find and import the Teu-Im repository
5. Click **Import**

#### Step 2: Configure Project Settings

1. **Project Name**: Enter your desired project name
2. **Root Directory**: Set to `apps/web`
3. **Framework Preset**: Should auto-detect as Next.js
4. Click **Continue**

#### Step 3: Set Environment Variables

1. Add all required environment variables from the [Environment Variables](#environment-variables) section
2. Keep `SUPABASE_SERVICE_ROLE_KEY` marked as secret (Vercel restricts it from preview deployments)
3. Preview deployments won't have access to the service role key, which is correct for security

**Vercel Environment Variable UI**:
- Click **Environment Variables** in project settings
- Add each variable with appropriate scope (Production, Preview, Development)
- For security-sensitive keys, select only "Production"

#### Step 4: Deploy

1. Click **Deploy**
2. Vercel builds and deploys automatically
3. Monitor build logs in the Vercel dashboard

#### Step 5: Configure Custom Domain (Optional)

1. Go to project **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. SSL certificate auto-configures via Let's Encrypt

#### Automatic Deployments

After initial setup, deployments automatically trigger on:
- Push to main branch (production)
- Push to other branches (preview deployments)

Disable automatic deployments in **Settings** → **Git** if needed.

#### Vercel CLI Deployment (Alternative)

For local deployments without GitHub:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (from project root)
cd /path/to/Teu-Im
vercel --cwd apps/web

# Production deployment
vercel --cwd apps/web --prod
```

### Self-Hosted

Deploy Teu-Im to your own infrastructure with Node.js and a reverse proxy.

#### System Requirements

- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows Server 2019+
- **Memory**: 2GB minimum (4GB recommended)
- **Disk**: 10GB for application and logs
- **Processor**: 1+ CPU cores
- **Uptime**: Node.js process manager (PM2, systemd, etc.)

#### Step 1: Prepare Server

```bash
# SSH into server
ssh user@your-server.com

# Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@10.28.1

# Install PM2 for process management
sudo npm install -g pm2
```

#### Step 2: Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/teu-im.git
cd teu-im

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env.local
# Edit with your credentials
nano apps/web/.env.local
```

#### Step 3: Build Application

```bash
# Build all packages and web app
pnpm build

# Verify build output
ls -la apps/web/.next
```

#### Step 4: Start with PM2

```bash
# Start application
pm2 start "pnpm start --cwd apps/web" --name "teu-im-web"

# Save PM2 config to restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs teu-im-web

# Monitor application
pm2 monit
```

#### Step 5: Configure Reverse Proxy

Use Nginx or Apache to handle HTTPS and routing.

**Nginx Configuration** (`/etc/nginx/sites-available/teu-im`):

```nginx
upstream teu_im {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (use Let's Encrypt with certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://teu_im;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/teu-im /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 6: Install SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Certificates auto-renew after installation
```

#### Step 7: Environment Variables Setup

```bash
# Copy example and configure
cp apps/web/.env.example apps/web/.env.local

# Edit with production values
cat > apps/web/.env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
EOF

# Restart application to load new variables
pm2 restart teu-im-web
```

#### Monitoring Self-Hosted Deployment

```bash
# View application logs
pm2 logs teu-im-web

# Check system health
pm2 monit

# Monitor server resources
top
df -h
free -m

# Check Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

#### Updates on Self-Hosted

```bash
# Pull latest code
git pull origin main

# Reinstall dependencies
pnpm install

# Rebuild application
pnpm build

# Restart application
pm2 restart teu-im-web

# Verify deployment
curl https://yourdomain.com/api/releases/latest
```

#### Database Backups

```bash
# Supabase handles backups automatically
# Access backup settings in Supabase Dashboard:
# Settings → Backups → Point in time recovery

# For additional safety, use pg_dump:
pg_dump -h your-project.db.supabase.co \
    -U postgres \
    -d postgres > backup_$(date +%Y%m%d).sql

# Store backup securely
```

---

## Desktop App Deployment

### Build for macOS

Prerequisites: Xcode Command Line Tools

```bash
cd apps/desktop

# Build web frontend
pnpm build

# Build desktop app
pnpm tauri:build

# Output: src-tauri/target/release/bundle/macos/Teu-Im.dmg
# or: src-tauri/target/release/bundle/dmg/Teu-Im.dmg
```

**Code Signing for macOS**:

```bash
# Create self-signed certificate for development
security create-keychain -p password teu-im.keychain
security import path/to/certificate.p12 -k ~/Library/Keychains/teu-im.keychain

# For production releases, use Apple Developer certificate
# Configure in src-tauri/tauri.conf.json:
# "bundle": { "macOS": { "signingIdentity": "Developer ID Application: ..." } }
```

### Build for Windows

Prerequisites: Visual Studio Build Tools or Visual Studio Community

```bash
cd apps/desktop

# Build web frontend
pnpm build

# Build desktop app
pnpm tauri:build

# Output: src-tauri/target/release/bundle/msi/Teu-Im_0.1.0_x64_en-US.msi
# or: src-tauri/target/release/bundle/nsis/Teu-Im_0.1.0_x64-setup.exe
```

### Build for Linux

Prerequisites: libssl-dev, pkg-config

```bash
# Ubuntu/Debian
sudo apt-get install -y libssl-dev pkg-config

# Build
cd apps/desktop
pnpm build
pnpm tauri:build

# Output: src-tauri/target/release/bundle/appimage/teu-im_0.1.0_amd64.AppImage
# or: src-tauri/target/release/bundle/deb/teu-im_0.1.0_amd64.deb
```

### Distribution

Store built artifacts in:
- GitHub Releases (recommended for public distribution)
- AWS S3 or CDN
- Your company's file server

**GitHub Release Workflow**:

```bash
# Tag release
git tag v0.1.0

# Push tag
git push origin v0.1.0

# Upload artifacts to release
gh release create v0.1.0 \
    src-tauri/target/release/bundle/macos/Teu-Im.dmg \
    src-tauri/target/release/bundle/msi/Teu-Im_0.1.0_x64_en-US.msi
```

### Auto-Updates

Desktop app checks for updates at `/api/releases/latest`:

```json
{
  "version": "0.4.3",
  "downloadUrl": "https://github.com/teu-im/releases/download/v0.4.3/app.dmg",
  "releaseDate": "2024-01-15",
  "releaseNotes": "Bug fixes and performance improvements"
}
```

Configure this endpoint in `apps/web/app/api/releases/latest/route.ts` to pull from GitHub API or your release server.

---

## Post-Deployment Checklist

Complete these steps after deploying to production.

### Immediate After Deployment

- [ ] **Verify Application Access**
  - [ ] Web app loads at your domain
  - [ ] Desktop app connects to API endpoint
  - [ ] API endpoints respond with 200 OK

- [ ] **Test Authentication**
  - [ ] Sign up creates new user
  - [ ] Login succeeds with correct credentials
  - [ ] Session persists on page refresh
  - [ ] Protected routes redirect unauthenticated users

- [ ] **Verify Database Connection**
  - [ ] Supabase connection working
  - [ ] Create a test project
  - [ ] Start a test session
  - [ ] Data persists in database

### Security Verification

- [ ] **HTTPS Enabled**
  - [ ] Site accessible only via HTTPS
  - [ ] No mixed content warnings
  - [ ] SSL certificate valid

- [ ] **Environment Variables Secure**
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` not exposed in client
  - [ ] Production secrets in Vercel/server secrets manager
  - [ ] No .env files in version control

- [ ] **CORS Configured**
  - [ ] Only trusted origins allowed
  - [ ] Desktop app can access API
  - [ ] Cross-origin requests work correctly

- [ ] **Rate Limiting Active**
  - [ ] `/api/audience/token` limited to 5 req/min per IP
  - [ ] `/api/join` limited to 5 req/min per code
  - [ ] Rate limit headers present in responses

### Performance Verification

- [ ] **Page Load Time**
  - [ ] Dashboard loads in <3 seconds
  - [ ] Sessions history loads in <2 seconds
  - [ ] No timeout errors

- [ ] **Monitoring Configured**
  - [ ] Error tracking enabled
  - [ ] Server logs accessible
  - [ ] Performance monitoring active

- [ ] **Database Performance**
  - [ ] Query times reasonable (<500ms)
  - [ ] No slow queries in logs
  - [ ] Database connections stable

### Feature Testing

- [ ] **Project Management**
  - [ ] Create project works
  - [ ] Edit project works
  - [ ] Delete project works
  - [ ] Project code and password generation works

- [ ] **Session Management**
  - [ ] Start session works
  - [ ] Session status updates work
  - [ ] End session works
  - [ ] Session history displays correctly

- [ ] **Audience Access**
  - [ ] Attendee join works with code
  - [ ] Attendee join works with token
  - [ ] Rate limiting prevents brute force

- [ ] **Real-Time Features**
  - [ ] Interpretations stream in real-time
  - [ ] Audio chunks upload successfully
  - [ ] Session status syncs across clients

### Backup and Recovery

- [ ] **Database Backups**
  - [ ] Supabase point-in-time recovery enabled
  - [ ] Manual backup process tested
  - [ ] Backup restoration tested

- [ ] **Application Rollback**
  - [ ] Previous version redeployable
  - [ ] Deployment history preserved
  - [ ] Quick rollback procedures documented

### Ongoing Maintenance

Schedule regular tasks:

**Daily**:
- [ ] Review error logs
- [ ] Check system health metrics
- [ ] Monitor rate limit incidents

**Weekly**:
- [ ] Review performance metrics
- [ ] Check for security alerts
- [ ] Update dependencies if needed

**Monthly**:
- [ ] Full system backup test
- [ ] Security audit
- [ ] User feedback review

**Quarterly**:
- [ ] Performance optimization review
- [ ] Database maintenance
- [ ] Security policy update

---

## Troubleshooting Deployment Issues

### Build Failures

**Error: `pnpm: command not found`**
```bash
npm install -g pnpm@10.28.1
```

**Error: `Cannot find module '@teu-im/shared'`**
```bash
# Clear and reinstall dependencies
pnpm install --force
```

**Error: Build timeout on Vercel**
- Check for large dependencies
- Optimize imports
- Increase Vercel build timeout in project settings

### Runtime Issues

**Error: `SUPABASE_SERVICE_ROLE_KEY is not defined`**
- Add environment variable to Vercel/server
- Service role key only needed for API routes, not client

**Error: `CORS error accessing API`**
- Verify `ALLOWED_ORIGINS` includes your domain
- Check CORS headers in `vercel.json` or Nginx config
- Verify Origin header sent by client

**Error: Rate limiting too aggressive**
- Review rate limit configuration in `lib/rate-limit.ts`
- Check if legitimate traffic being blocked
- Whitelist trusted IPs if needed

### Database Issues

**Error: `No such table 'projects'`**
- Verify Supabase schema initialized
- Run migrations from `packages/supabase`
- Check RLS policies enabled

**Error: `Database connection refused`**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is active
- Verify API key is valid

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Deployment Guide](https://supabase.com/docs/guides/hosting/overview)
- [Tauri Desktop Deployment](https://tauri.app/v1/guides/distribution/sign/)
- [Nginx Configuration](https://nginx.org/en/docs/)

