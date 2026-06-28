# 🐳 Docker Compose Setup Guide

Complete guide to run the entire Jobocate application locally using Docker Compose.

## 📋 Prerequisites

Before you begin, ensure you have:
- **Docker Desktop** installed (https://www.docker.com/products/docker-desktop/)
  - For Mac: Docker Desktop for Mac
  - For Windows: Docker Desktop for Windows
  - For Linux: Docker Engine + Docker Compose
- **Minimum 4GB RAM** allocated to Docker
- **Ports Available**: 3000, 8000, 27017

## 🚀 Quick Start (5 minutes)

### 1. Clone and Navigate to Project
```bash
cd /path/to/jobocate
```

### 2. Update Google OAuth Settings

**IMPORTANT:** Update your Google OAuth redirect URIs:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your OAuth client ID
3. Add these URIs:
   
   **Authorized redirect URIs:**
   ```
   http://localhost:8000/api/auth/google/callback
   ```
   
   **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   http://localhost:8000
   ```

4. Click **Save**
5. Wait 5-10 minutes for changes to propagate

### 3. (Optional) Configure LinkedIn OAuth

If you want LinkedIn sign-in:

```bash
# Create .env file from example
cp .env.example .env

# Edit .env and add your LinkedIn credentials
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

### 4. Start All Services

```bash
# Build and start all containers
docker-compose up --build

# Or run in background (detached mode)
docker-compose up -d --build
```

This will start:
- ✅ MongoDB (port 27017)
- ✅ Backend API (port 8000)
- ✅ Frontend (port 3000)

### 5. Access the Application

Open your browser and visit:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/health
- **Login Page**: http://localhost:3000/login

## 📦 What's Running?

### Frontend (React/Next.js)
- **URL**: http://localhost:3000
- **Container**: jobocate-frontend
- **Hot Reload**: ✅ Enabled (changes auto-refresh)

### Backend (Node.js/Express)
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/health
- **Container**: jobocate-backend
- **Database**: Connected to MongoDB

### MongoDB
- **Port**: 27017
- **Database**: jobocate
- **Container**: jobocate-mongodb
- **Persistence**: Data saved in Docker volume

## 🛠 Common Commands

### Start Services
```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# Start and rebuild
docker-compose up --build
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v
```

### View Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Follow logs in real-time
docker-compose logs -f backend
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Execute Commands Inside Container
```bash
# Access backend shell
docker-compose exec backend sh

# Access frontend shell
docker-compose exec frontend sh

# Access MongoDB shell
docker-compose exec mongodb mongosh jobocate
```

### Clean Up Everything
```bash
# Stop containers and remove volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a
```

## 🔧 Development Workflow

### Making Code Changes

**Frontend Changes:**
1. Edit files in `/frontend/src/`
2. Browser auto-refreshes (hot reload enabled)
3. No rebuild needed!

**Backend Changes:**
1. Edit files in `/backend/`
2. Server automatically restarts
3. No rebuild needed!

**Environment Variables:**
1. Edit `docker-compose.yml` for changes
2. Restart containers: `docker-compose restart`

### Installing New Dependencies

**Frontend:**
```bash
# Enter container
docker-compose exec frontend sh

# Install package
yarn add package-name

# Exit container
exit

# Restart to apply
docker-compose restart frontend
```

**Backend:**
```bash
# Enter container
docker-compose exec backend sh

# Install package
npm install package-name

# Exit container
exit

# Restart to apply
docker-compose restart backend
```

## 🧪 Testing OAuth Locally

### Google OAuth
1. Ensure Google OAuth redirect URIs are updated (see Quick Start step 2)
2. Go to http://localhost:3000/login
3. Click "Continue with Google"
4. Sign in with Google
5. Should redirect back to http://localhost:3000/auth/success
6. Then redirect to dashboard

### LinkedIn OAuth (if configured)
1. Add credentials to `.env` file
2. Restart services: `docker-compose restart`
3. Go to http://localhost:3000/login
4. Click "Continue with LinkedIn"
5. Follow OAuth flow

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :27017 # MongoDB

# Kill the process or change ports in docker-compose.yml
```

### Cannot Connect to MongoDB
```bash
# Check MongoDB is running
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Frontend Not Loading
```bash
# Check logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up --build frontend

# Clear Next.js cache
docker-compose exec frontend sh -c "rm -rf .next"
docker-compose restart frontend
```

### Backend API Not Responding
```bash
# Check logs
docker-compose logs backend

# Check if MongoDB is connected
docker-compose logs backend | grep MongoDB

# Restart backend
docker-compose restart backend
```

### OAuth "redirect_uri_mismatch" Error
- Verify Google OAuth settings include `http://localhost:8000/api/auth/google/callback`
- Wait 5-10 minutes after updating Google settings
- Clear browser cache
- Try incognito mode

### Container Won't Start
```bash
# Check container status
docker-compose ps

# View error logs
docker-compose logs [service-name]

# Remove and rebuild
docker-compose down
docker-compose up --build
```

### Database Data Persists After Restart
This is intentional! Data is stored in a Docker volume.

To reset database:
```bash
# Stop and remove volumes
docker-compose down -v

# Start fresh
docker-compose up
```

## 📊 Database Management

### Access MongoDB Shell
```bash
docker-compose exec mongodb mongosh jobocate
```

### Common MongoDB Commands
```javascript
// List all collections
show collections

// View users
db.users.find().pretty()

// Count users
db.users.countDocuments()

// Delete all users (⚠️ careful!)
db.users.deleteMany({})

// Find user by email
db.users.findOne({ email: "user@example.com" })
```

### Backup Database
```bash
# Create backup
docker-compose exec -T mongodb mongodump --db jobocate --archive > backup.dump

# Restore backup
docker-compose exec -T mongodb mongorestore --db jobocate --archive < backup.dump
```

## 🔐 Security Notes

### For Local Development
- Default credentials are fine for local development
- Don't commit `.env` file to version control
- JWT secret is set in docker-compose.yml

### For Production
- Use environment-specific secrets
- Enable HTTPS
- Use strong JWT secrets
- Restrict CORS origins
- Use environment variables for all sensitive data

## 📁 Project Structure

```
jobocate/
├── docker-compose.yml          # Docker orchestration
├── .env.example               # Environment template
├── .env                       # Your local environment (create this)
├── backend/
│   ├── Dockerfile            # Backend container config
│   ├── server.js             # Express server
│   ├── package.json          # Node dependencies
│   └── .dockerignore         # Files to exclude
├── frontend/
│   ├── Dockerfile            # Frontend container config
│   ├── package.json          # React dependencies
│   ├── src/                  # React source code
│   └── .dockerignore         # Files to exclude
└── DOCKER_SETUP.md           # This file
```

## 🎯 Next Steps

1. **Start developing**: Edit code and see changes instantly
2. **Test OAuth**: Click Google/LinkedIn sign-in buttons
3. **Check database**: Use MongoDB shell to inspect data
4. **Build features**: Create new pages, APIs, components
5. **Deploy**: When ready, deploy to production environment

## 💡 Tips

- Keep Docker Desktop running while developing
- Use `docker-compose logs -f` to monitor all services
- Restart services after changing environment variables
- MongoDB data persists between restarts
- Hot reload works for both frontend and backend
- Use VSCode Docker extension for easier management

## 🆘 Need Help?

- **Docker Issues**: Check Docker Desktop logs
- **Build Errors**: Try `docker-compose build --no-cache`
- **Network Issues**: Restart Docker Desktop
- **Permission Issues**: Ensure Docker has proper permissions

---

**Happy Coding! 🚀**

For questions or issues, check the logs first:
```bash
docker-compose logs -f
```
