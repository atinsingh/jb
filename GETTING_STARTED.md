# 🎯 Getting Started Checklist

Follow these steps to get your Jobocate application running locally.

## ✅ Checklist

### Step 1: Install Docker Desktop
- [ ] Download from https://www.docker.com/products/docker-desktop/
- [ ] Install and start Docker Desktop
- [ ] Verify: Run `docker --version` in terminal

### Step 2: Update Google OAuth Settings
- [ ] Go to https://console.cloud.google.com/apis/credentials
- [ ] Click on your OAuth client ID
- [ ] Add to "Authorized redirect URIs":
      ```
      http://localhost:8000/api/auth/google/callback
      ```
- [ ] Add to "Authorized JavaScript origins":
      ```
      http://localhost:3000
      http://localhost:8000
      ```
- [ ] Click Save
- [ ] Wait 5-10 minutes for changes to propagate

### Step 3: (Optional) Configure LinkedIn
- [ ] Create app at https://www.linkedin.com/developers/apps
- [ ] Add redirect URI: `http://localhost:8000/api/auth/linkedin/callback`
- [ ] Copy Client ID and Secret
- [ ] Create `.env` file: `cp .env.example .env`
- [ ] Add credentials to `.env` file

### Step 4: Start the Application
- [ ] Open terminal in project directory
- [ ] Run: `./start.sh` or `docker-compose up --build`
- [ ] Wait for all services to start (may take 2-3 minutes first time)

### Step 5: Test the Application
- [ ] Open browser to http://localhost:3000
- [ ] Navigate to http://localhost:3000/login
- [ ] Click "Continue with Google"
- [ ] Sign in with your Google account
- [ ] Verify redirect to dashboard

## 🎉 Success Indicators

You'll know everything is working when:

✅ **Frontend loads** at http://localhost:3000
✅ **Backend responds** at http://localhost:8000/api/health
✅ **MongoDB is connected** (check backend logs)
✅ **Google sign-in works** (redirects and creates user)
✅ **You see the dashboard** after signing in

## 📊 Check Service Status

```bash
# View all running containers
docker-compose ps

# Should show:
# - jobocate-mongodb    (running)
# - jobocate-backend    (running)
# - jobocate-frontend   (running)
```

## 🔍 Verify Each Service

### Check Frontend
```bash
# Should see the login page
open http://localhost:3000/login
```

### Check Backend
```bash
# Should return: {"status":"ok","message":"Server is running"}
curl http://localhost:8000/api/health
```

### Check MongoDB
```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh jobocate

# Run inside MongoDB shell:
show collections
exit
```

## 🐛 Something Not Working?

### Services Won't Start
```bash
# Check logs
docker-compose logs

# Try rebuilding
docker-compose down
docker-compose up --build
```

### Port Already in Use
```bash
# Option 1: Stop other services using those ports
lsof -i :3000
lsof -i :8000

# Option 2: Change ports in docker-compose.yml
# Edit ports section for each service
```

### Google OAuth Error
- Wait 5-10 minutes after updating settings
- Clear browser cache
- Try incognito mode
- Verify redirect URI is EXACTLY: `http://localhost:8000/api/auth/google/callback`

### MongoDB Connection Error
```bash
# Restart MongoDB
docker-compose restart mongodb

# Check MongoDB logs
docker-compose logs mongodb
```

## 📚 Next Steps

Once everything is running:

1. **Test OAuth**: Sign in with Google
2. **Explore the app**: Browse pages and features
3. **Check database**: View users in MongoDB
4. **Start developing**: Make changes and see live updates
5. **Read docs**: Check DOCKER_SETUP.md for advanced usage

## 🆘 Need More Help?

1. Check [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed documentation
2. View logs: `docker-compose logs -f`
3. Restart services: `docker-compose restart`
4. Clean start: `docker-compose down -v && docker-compose up --build`

---

**Happy Developing! 🚀**

For issues, always check the logs first:
```bash
docker-compose logs -f
```
