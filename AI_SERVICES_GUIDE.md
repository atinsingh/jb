# AI Services Complete Setup Guide

## 🎉 What's Been Built

A complete AI-powered job search backend with the following features:

### ✅ AI Services
- **Resume Parser** - Upload PDF/DOCX, extract structured data with AI
- **Job Scraper** - Scrape jobs from Indeed (LinkedIn/Glassdoor placeholders)
- **Job Matcher** - AI-powered candidate-job matching with scoring
- **Cover Letter Generator** - Auto-generate personalized cover letters
- **Application Agent** - Auto-apply to jobs based on match threshold

### ✅ Backend Structure
```
backend/
├── server.js                      # Main server with OAuth
├── src/
│   ├── ai-services/
│   │   └── ai-provider.js        # Multi-provider AI (OpenAI, Anthropic, Google)
│   ├── resume-parser/
│   │   └── resume-parser.service.js
│   ├── job-scraper/
│   │   └── job-scraper.service.js
│   ├── job-matching/
│   │   └── job-matching.service.js
│   ├── application-agent/
│   │   └── application-agent.service.js
│   ├── models/
│   │   ├── User.js               # Extended with candidate profile
│   │   ├── Job.js                # Job listings
│   │   ├── JobMatch.js           # Match scores
│   │   └── Application.js        # Application tracking
│   ├── routes/
│   │   ├── index.js              # Main router
│   │   ├── auth.routes.js        # OAuth & profile
│   │   ├── resume.routes.js      # Resume parsing
│   │   ├── job.routes.js         # Job scraping & search
│   │   ├── matching.routes.js    # AI matching
│   │   └── application.routes.js # Applications
│   └── middleware/
│       ├── auth.middleware.js    # JWT verification
│       ├── upload.middleware.js  # File uploads
│       └── error.middleware.js   # Error handling
```

---

## 🚀 Quick Start

### 1. Set Up AI Provider

You MUST provide an API key for AI services to work. Choose one:

**Option A: Use Emergent LLM Key (Recommended)**
```bash
# Edit backend/.env
EMERGENT_LLM_KEY=your_emergent_llm_key
AI_PROVIDER=openai
```

**Option B: Use OpenAI Directly**
```bash
# Edit backend/.env
OPENAI_API_KEY=your_openai_api_key
AI_PROVIDER=openai
```

**Option C: Use Anthropic**
```bash
# Edit backend/.env
ANTHROPIC_API_KEY=your_anthropic_api_key
AI_PROVIDER=anthropic
```

### 2. Start with Docker

```bash
# Make sure you've added AI keys to backend/.env
./start.sh
```

Or manually:
```bash
docker-compose up --build
```

### 3. Test AI Services

```bash
# Test health
curl http://localhost:8000/api/health

# Login first to get token
# Then test resume parsing
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "resume=@your-resume.pdf" \
  http://localhost:8000/api/resume/parse
```

---

## 📝 Complete User Flow

### Step 1: Authentication
1. User visits `/login`
2. Clicks "Continue with Google"
3. OAuth completes → receives JWT token
4. Redirected to dashboard

### Step 2: Profile Setup
1. Upload resume via `/api/resume/parse`
2. AI extracts: name, skills, experience, education
3. Profile auto-populates
4. User can edit/update via `/api/auth/profile`

### Step 3: Job Discovery
1. System scrapes jobs via `/api/jobs/scrape`
   - Keywords: ["software engineer", "react"]
   - Location: "San Francisco"
2. Jobs saved to database with deduplication
3. User searches via `/api/jobs/search`

### Step 4: AI Matching
1. System calculates matches via `/api/matching/calculate/:jobId`
2. AI analyzes:
   - Candidate skills vs job requirements
   - Experience level match
   - Location preferences
3. Returns match score (0-100) with reasoning

### Step 5: Get Recommendations
1. User requests `/api/matching/recommendations`
2. System:
   - Gets recent jobs
   - Calculates matches for all
   - Returns top N matches sorted by score
3. User reviews recommendations

### Step 6: Apply to Jobs

**Manual Apply:**
1. User clicks "Apply" on job
2. POST to `/api/applications/apply/:jobId`
3. System:
   - Calculates match if not done
   - Generates personalized cover letter
   - Creates application record
4. User gets cover letter to review/edit

**Auto-Apply:**
1. User enables auto-apply in settings
2. Sets minimum match score (e.g., 80%)
3. Triggers `/api/applications/auto-apply`
4. System:
   - Finds jobs above threshold
   - Generates cover letters
   - Creates applications
   - Respects daily limit

### Step 7: Track Applications
1. View all: `/api/applications`
2. Update status: `/api/applications/:id/status`
3. Get stats: `/api/applications/stats/summary`

---

## 🔧 Configuration

### AI Provider Settings

**OpenAI (Default)**
- Model: `gpt-4o-mini`
- Best for: Fast, cost-effective
- Use case: Resume parsing, quick matching

**Anthropic**
- Model: `claude-3-haiku-20240307`
- Best for: Detailed analysis
- Use case: Complex job matching

**Google (Coming Soon)**
- Model: TBD
- Integration ready, needs implementation

### Job Scraping Settings

```bash
JOB_SCRAPING_ENABLED=true       # Enable/disable scraping
MAX_JOBS_PER_SCRAPE=50          # Limit per scrape
```

**Supported Sources:**
- ✅ Indeed (active)
- 🔄 LinkedIn (API integration needed)
- 🔄 Glassdoor (API integration needed)

### Auto-Apply Settings

```bash
AUTO_APPLICATION_ENABLED=false   # Master switch
MIN_MATCH_SCORE_FOR_AUTO_APPLY=75  # Minimum score to apply
MAX_APPLICATIONS_PER_DAY=20      # Daily limit per user
```

**Safety Features:**
- Requires complete profile
- User must explicitly enable
- Daily application limit
- Match score threshold
- Application deduplication

---

## 🧪 Testing Guide

### Test Resume Parsing

```bash
# 1. Login and get token
TOKEN="your_jwt_token"

# 2. Upload resume
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "resume=@resume.pdf" \
  http://localhost:8000/api/resume/parse

# Expected: Parsed data with skills, experience, education
```

### Test Job Scraping

```bash
# Scrape software engineer jobs in SF
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keywords":["software engineer","react"],"location":"San Francisco"}' \
  http://localhost:8000/api/jobs/scrape

# Expected: Jobs scraped and saved count
```

### Test AI Matching

```bash
# Get job ID first
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/jobs?limit=1

# Calculate match for that job
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/matching/calculate/JOB_ID

# Expected: Match score, matched skills, missing skills, reasoning
```

### Test Recommendations

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/matching/recommendations?limit=10

# Expected: Top 10 jobs with match scores
```

### Test Application

```bash
# Apply to a job
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/applications/apply/JOB_ID

# Expected: Application created with AI-generated cover letter
```

---

## 🐛 Troubleshooting

### "Failed to parse resume with AI"

**Cause:** No AI API key configured

**Fix:**
```bash
# Add to backend/.env
OPENAI_API_KEY=your_key
# OR
EMERGENT_LLM_KEY=your_key

# Restart
docker-compose restart backend
```

### "Job scraping failed"

**Causes:**
1. Indeed blocking requests (rate limit)
2. Selector changes on Indeed

**Fix:**
- Wait and retry
- Check logs: `docker-compose logs backend`
- Adjust `MAX_JOBS_PER_SCRAPE` to lower value

### "Auto-apply not working"

**Checklist:**
- [ ] Profile complete? (check `/api/auth/me`)
- [ ] Auto-apply enabled? (set in profile)
- [ ] Match threshold set? (default 75)
- [ ] Jobs available? (check `/api/jobs`)
- [ ] Daily limit reached? (check application stats)

### "Match calculation slow"

**Normal:** AI matching takes 2-5 seconds per job

**If too slow:**
- Use batch matching: `/api/matching/batch`
- Switch to faster model (gpt-4o-mini)
- Cache results (matches saved in DB)

---

## 📊 Database Schema

### User (Extended)
```javascript
{
  // Auth
  email, password, googleId, linkedinId,
  
  // Profile
  name, phone, location, summary,
  skills: [String],
  experience: [{title, company, duration, description}],
  education: [{degree, institution, year}],
  
  // Settings
  autoApply: Boolean,
  minMatchScore: Number,
  preferredLocations: [String],
  
  // Meta
  resumePath, resumeText, profileComplete
}
```

### Job
```javascript
{
  title, companyName, location, description,
  skills: [String],
  requirements: [String],
  salary, jobType, experience,
  source: 'Indeed'|'LinkedIn'|'Glassdoor',
  externalUrl, externalId (unique),
  isActive, scrapedAt
}
```

### JobMatch
```javascript
{
  userId, jobId,
  matchScore: 0-100,
  matchedSkills: [String],
  missingSkills: [String],
  reasoning: String,
  isInterested: Boolean
}
```

### Application
```javascript
{
  candidateId, jobId,
  matchScore, coverLetter, resume,
  status: 'pending'|'submitted'|'reviewing'|...,
  autoApplied: Boolean,
  appliedAt, submittedAt
}
```

---

## 🔐 Security Notes

### Production Checklist

- [ ] Change JWT_SECRET to strong random string
- [ ] Use HTTPS only
- [ ] Set secure cookies
- [ ] Implement rate limiting
- [ ] Sanitize file uploads
- [ ] Add CSRF protection
- [ ] Validate all inputs
- [ ] Use environment variables for all secrets
- [ ] Enable MongoDB authentication
- [ ] Restrict CORS origins

### API Key Management

**Never commit API keys!**

✅ Do:
- Use environment variables
- Use .env files (gitignored)
- Use secret managers in production
- Rotate keys regularly

❌ Don't:
- Hardcode keys
- Commit .env to git
- Share keys in plain text
- Use same keys for dev/prod

---

## 📈 Performance Optimization

### Resume Parsing
- Cache parsed resumes in database
- Process in background for large files
- Use worker queues for batch processing

### Job Scraping
- Schedule periodic scraping (cron job)
- Implement rate limiting
- Cache scraped jobs
- Use proxy rotation if needed

### AI Matching
- Batch calculate matches
- Cache match results
- Use simpler models for initial filtering
- Reserve complex models for final matching

### Auto-Apply
- Run as scheduled job (not real-time)
- Process in batches
- Implement retry logic
- Track API usage

---

## 🚢 Deployment

### Separate AI Service Deployment

The AI services can be deployed independently:

**Option 1: Monolithic (Current)**
```
Frontend ← Backend (with AI services) ← MongoDB
```

**Option 2: Microservices (Recommended for scale)**
```
Frontend ← API Gateway ← {
  Auth Service
  Job Service
  AI Service (separate)
  Application Service
} ← MongoDB
```

To deploy AI services separately:
1. Create new Docker image with just AI services
2. Expose via internal API
3. Update main backend to call AI service
4. Scale AI service independently

---

## 📚 Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Docker Setup Guide](./DOCKER_SETUP.md)
- [Supabase Auth Setup](./SUPABASE_AUTH_SETUP.md)

---

**Need Help?**

Check logs first:
```bash
docker-compose logs -f backend
```

Common issues usually related to:
1. Missing AI API keys
2. MongoDB connection
3. OAuth redirect URIs
4. File upload permissions

---

**🎉 You now have a complete AI-powered job search platform!**
