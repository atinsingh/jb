# Jobocate API Documentation

Complete API reference for all AI-powered job search features.

## Base URL

- Local: `http://localhost:8000/api`
- Preview: `https://843e7c48-27ec-472b-838a-c444758e23be.preview.emergentagent.com/api`

## Authentication

Most endpoints require JWT authentication via Bearer token:

```
Authorization: Bearer <token>
```

---

## Auth Routes

### Google OAuth Login
```
GET /api/auth/google
```
Redirects to Google OAuth login page.

### LinkedIn OAuth Login
```
GET /api/auth/linkedin
```
Redirects to LinkedIn OAuth login page.

### Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "picture": "url",
    "skills": ["JavaScript", "React"],
    "profileComplete": true
  }
}
```

### Update Profile
```
PATCH /api/auth/profile
Authorization: Bearer <token>

{
  "name": "John Doe",
  "phone": "+1234567890",
  "location": "San Francisco, CA",
  "summary": "Full-stack developer...",
  "skills": ["JavaScript", "React", "Node.js"],
  "autoApply": true,
  "minMatchScore": 80
}
```

---

## Resume Routes

### Parse Resume
```
POST /api/resume/parse
Authorization: Bearer <token>
Content-Type: multipart/form-data

resume: <PDF or DOCX file>
```

**Response:**
```json
{
  "message": "Resume parsed successfully",
  "parsedData": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "summary": "...",
    "skills": ["JavaScript", "React"],
    "experience": [...],
    "education": [...]
  },
  "user": {...}
}
```

### Get Resume Data
```
GET /api/resume/data
Authorization: Bearer <token>
```

---

## Job Routes

### Scrape Jobs
```
POST /api/jobs/scrape
Authorization: Bearer <token>

{
  "keywords": ["software engineer", "react"],
  "location": "San Francisco"
}
```

**Response:**
```json
{
  "message": "Job scraping completed",
  "scraped": 50,
  "saved": 48
}
```

### Search Jobs
```
GET /api/jobs/search?keywords=react&location=SF&limit=20&skip=0
Authorization: Bearer <token>
```

**Response:**
```json
{
  "jobs": [...],
  "total": 150,
  "limit": 20,
  "skip": 0
}
```

### Get Job Details
```
GET /api/jobs/:id
Authorization: Bearer <token>
```

### Get All Jobs
```
GET /api/jobs?limit=50&skip=0
Authorization: Bearer <token>
```

---

## Matching Routes

### Calculate Match for Job
```
POST /api/matching/calculate/:jobId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "match": {
    "matchScore": 85,
    "matchedSkills": ["JavaScript", "React"],
    "missingSkills": ["Python"],
    "reasoning": "Strong match based on..."
  },
  "job": {...}
}
```

### Get All Matches
```
GET /api/matching/matches?minScore=70&limit=50
Authorization: Bearer <token>
```

### Mark as Interested
```
PATCH /api/matching/interest/:jobId
Authorization: Bearer <token>

{
  "interested": true
}
```

### Get Interested Jobs
```
GET /api/matching/interested
Authorization: Bearer <token>
```

### Get Recommendations
```
GET /api/matching/recommendations?limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "recommendations": [
    {
      "job": {...},
      "matchScore": 92,
      "matchedSkills": [...],
      "missingSkills": [...],
      "reasoning": "..."
    }
  ],
  "total": 15
}
```

### Batch Calculate Matches
```
POST /api/matching/batch
Authorization: Bearer <token>

{
  "jobIds": ["job_id_1", "job_id_2", "job_id_3"]
}
```

---

## Application Routes

### Apply to Job
```
POST /api/applications/apply/:jobId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "application": {
    "id": "app_id",
    "jobId": "job_id",
    "matchScore": 85,
    "coverLetter": "...",
    "status": "pending"
  },
  "job": {...},
  "coverLetter": "..."
}
```

### Get All Applications
```
GET /api/applications?status=pending&limit=50
Authorization: Bearer <token>
```

### Get Application Details
```
GET /api/applications/:id
Authorization: Bearer <token>
```

### Update Application Status
```
PATCH /api/applications/:id/status
Authorization: Bearer <token>

{
  "status": "submitted",
  "notes": "Submitted via LinkedIn"
}
```

Valid statuses: `pending`, `submitted`, `reviewing`, `interviewed`, `rejected`, `accepted`

### Auto-Apply to Jobs
```
POST /api/applications/auto-apply
Authorization: Bearer <token>
```

**Requirements:**
- Profile must be complete
- Auto-apply must be enabled in settings
- Will apply to jobs with match score >= minMatchScore

**Response:**
```json
{
  "message": "Auto-applied to 15 jobs",
  "applications": [...],
  "stats": {
    "total": 15,
    "pending": 15,
    "averageMatchScore": 82
  }
}
```

### Get Application Statistics
```
GET /api/applications/stats/summary
Authorization: Bearer <token>
```

### Delete Application
```
DELETE /api/applications/:id
Authorization: Bearer <token>
```

---

## Error Responses

All endpoints may return these error responses:

**400 Bad Request**
```json
{
  "error": "Error message"
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**404 Not Found**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## AI Services Configuration

### Environment Variables

```bash
# Choose AI provider
AI_PROVIDER=openai  # or anthropic, google

# API Keys (provide at least one)
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
EMERGENT_LLM_KEY=your_key  # Universal key for OpenAI, Anthropic, Google

# Storage
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads/resumes

# Job Scraping
JOB_SCRAPING_ENABLED=true
MAX_JOBS_PER_SCRAPE=50

# Auto-Application
AUTO_APPLICATION_ENABLED=false
MIN_MATCH_SCORE_FOR_AUTO_APPLY=75
MAX_APPLICATIONS_PER_DAY=20
```

---

## Workflow Examples

### Complete Onboarding Flow

1. **OAuth Login** → User logs in with Google/LinkedIn
2. **Upload Resume** → `POST /api/resume/parse`
3. **Review Profile** → `GET /api/auth/me`
4. **Update Profile** → `PATCH /api/auth/profile`

### Job Search & Application Flow

1. **Scrape Jobs** → `POST /api/jobs/scrape`
2. **Get Recommendations** → `GET /api/matching/recommendations`
3. **View Job Details** → `GET /api/jobs/:id`
4. **Calculate Match** → `POST /api/matching/calculate/:jobId`
5. **Mark Interested** → `PATCH /api/matching/interest/:jobId`
6. **Apply** → `POST /api/applications/apply/:jobId`
7. **Track Application** → `GET /api/applications/:id`

### Auto-Apply Flow

1. **Enable Auto-Apply** → `PATCH /api/auth/profile` with `autoApply: true`
2. **Set Match Threshold** → `PATCH /api/auth/profile` with `minMatchScore: 80`
3. **Trigger Auto-Apply** → `POST /api/applications/auto-apply`
4. **Check Stats** → `GET /api/applications/stats/summary`

---

## Rate Limits

- Resume parsing: 10 requests/hour
- Job scraping: 5 requests/hour
- AI matching: 100 requests/hour
- Auto-apply: 1 request/day per user

---

## Testing

Use these curl commands to test endpoints:

```bash
# Get health check
curl http://localhost:8000/health

# Search jobs (with auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/jobs/search?keywords=react&limit=10

# Calculate match
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/matching/calculate/JOB_ID
```

---

For questions or issues, check the logs:
```bash
docker-compose logs -f backend
```
