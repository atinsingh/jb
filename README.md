# Jobocate - AI-Powered Job Search Platform

AI-powered job search application with Google and LinkedIn OAuth authentication.

## 📖 Developer documentation (start here)

These are the current, authoritative docs — trust them over the older scattered `*.md` files where they conflict:

- **[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)** — architecture, how to run, env vars, the backend/frontend maps, gotchas, and how to fix/extend common things.
- **[docs/SECURITY.md](docs/SECURITY.md)** — security model, the hardening audit + fixes, and the release checklist.
- **[docs/product/parity-gaps-spec.md](docs/product/parity-gaps-spec.md)** — competitive product roadmap (Chrome-extension autofill, referrals).

## 🚀 Quick Start with Docker

**Prerequisites**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Option 1: Using Startup Script (Easiest)
```bash
./start.sh
```

### Option 2: Manual Docker Compose
```bash
docker-compose up --build
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/health
- **Login Page**: http://localhost:3000/login

## 📚 Documentation

- **[Docker Setup Guide](DOCKER_SETUP.md)** - Complete Docker Compose documentation
- **[Supabase Auth Setup](SUPABASE_AUTH_SETUP.md)** - Supabase projects, providers and keys

## ✨ Features

- ✅ Google OAuth Sign-In (Pre-configured)
- ✅ LinkedIn OAuth Sign-In (Add your credentials)
- ✅ Beautiful modern UI with two-column auth layout
- ✅ JWT token authentication
- ✅ MongoDB database with user management
- ✅ Hot reload for frontend and backend

## 🛠 Tech Stack

- **Frontend**: React, Next.js, Tailwind CSS
- **Backend**: Node.js, Express, Passport.js
- **Database**: MongoDB
- **Auth**: Google OAuth 2.0, LinkedIn OAuth 2.0

## 📝 Important Setup Steps

### 1. Update Google OAuth Settings

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and add:

**Authorized redirect URIs:**
```
http://localhost:8000/api/auth/google/callback
```

**Authorized JavaScript origins:**
```
http://localhost:3000
http://localhost:8000
```

### 2. (Optional) Add LinkedIn OAuth

1. Create app at [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Add redirect URI: `http://localhost:8000/api/auth/linkedin/callback`
3. Copy credentials to `.env`:
   ```
   LINKEDIN_CLIENT_ID=your_id
   LINKEDIN_CLIENT_SECRET=your_secret
   ```
4. Restart: `docker-compose restart backend`

## 🎯 Development Commands

```bash
# Start all services
docker-compose up

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart backend
docker-compose restart backend

# Access MongoDB
docker-compose exec mongodb mongosh jobocate
```

## 📦 Project Structure

```
jobocate/
├── frontend/           # React/Next.js frontend
├── backend/            # Node.js/Express backend
├── docker-compose.yml  # Docker orchestration
├── start.sh           # Quick start script
└── stop.sh            # Quick stop script
```

## 🐛 Troubleshooting

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed troubleshooting guide.

Common issues:
- **Port in use**: Change ports in `docker-compose.yml`
- **OAuth error**: Update Google OAuth redirect URIs
- **Container won't start**: Run `docker-compose down -v && docker-compose up --build`

## 📄 License

This project is private and proprietary.
