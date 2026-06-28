# Phase 1 Implementation - Backend Infrastructure

## Overview
Phase 1 implements the complete backend infrastructure for AI-powered job search features including resume parsing, job scraping, job matching, and application agent.

## Completed Features

### 1. AI Service Module (`/src/ai-service`)
**Purpose**: Configurable AI provider support for cost optimization

**Features**:
- Support for multiple AI providers (OpenAI, Anthropic, Google)
- Configurable via environment variables
- Unified interface for all AI operations
- Resume parsing with structured data extraction
- Job matching with AI-powered scoring
- Cover letter generation

**API Configuration**:
```env
AI_PROVIDER=openai  # or anthropic, google
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
GOOGLE_AI_API_KEY=your_key
```

**Key Methods**:
- `parseResume(resumeText)` - Extract structured data from resume text
- `calculateJobMatch(candidateSkills, jobRequirements, jobDescription)` - Calculate match score
- `generateCoverLetter(candidateInfo, jobInfo)` - Generate personalized cover letter

---

### 2. Resume Parser Module (`/src/resume-parser`)
**Purpose**: Upload, parse, and auto-create candidate profiles

**Features**:
- PDF and DOCX resume upload support
- Text extraction from documents
- AI-powered data extraction
- Dual storage support (local and S3)
- Automatic profile creation/update

**Storage Configuration**:
```env
STORAGE_TYPE=local  # or s3
LOCAL_STORAGE_PATH=./uploads/resumes

# S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
```

**API Endpoints**:
- `POST /api/resume/parse` - Upload and parse resume
  - Headers: `Authorization: Bearer <token>`
  - Body: FormData with 'resume' field (PDF/DOCX, max 5MB)
  - Response: Parsed data + profile update confirmation

---

### 3. Job Scraper Module (`/src/job-scraper`)
**Purpose**: Web-based job scraping from multiple sources

**Features**:
- Web scraping from Indeed (LinkedIn, Glassdoor ready for API integration)
- Keyword and location-based search
- Duplicate prevention with external ID tracking
- Configurable rate limiting
- Full-text search on jobs

**Configuration**:
```env
JOB_SCRAPING_ENABLED=true
MAX_JOBS_PER_SCRAPE=50
```

**API Endpoints**:
- `POST /api/jobs/scraper/trigger` - Trigger scraping
  - Body: `{ keywords: string[], location?: string }`
  - Response: Jobs scraped and saved count
  
- `GET /api/jobs/scraper/search` - Search scraped jobs
  - Query: `keywords, location, skills, source, limit, skip`
  - Response: Jobs array + total count
  
- `GET /api/jobs/scraper/:id` - Get job details

**Database Schema**:
```typescript
{
  title: string
  companyName: string
  location: string
  description: string
  skills: string[]
  requirements: string[]
  salary: string
  jobType: string
  experience: string
  source: 'LinkedIn' | 'Indeed' | 'Glassdoor'
  externalUrl: string
  externalId: string (unique)
  isActive: boolean
  scrapedAt: Date
}
```

---

### 4. Job Matching Module (`/src/job-matching`)
**Purpose**: AI-powered job matching and recommendations

**Features**:
- Calculate match scores between candidates and jobs
- Track matched/missing skills
- Mark jobs as interested
- Generate job recommendations
- Track application status

**API Endpoints**:
- `POST /api/job-matching/calculate/:jobId` - Calculate match for a job
  - Response: Match score, matched skills, missing skills, reasoning
  
- `GET /api/job-matching/matches` - Get all matches
  - Query: `minScore, isInterested, limit, skip`
  - Response: Matches array with populated job data
  
- `PATCH /api/job-matching/interest/:jobId` - Mark as interested
  - Body: `{ interested: boolean }`
  - Response: Updated match
  
- `GET /api/job-matching/interested` - Get interested jobs
  - Response: All jobs marked as interested
  
- `GET /api/job-matching/recommendations` - Get AI recommendations
  - Query: `limit`
  - Response: Top matched jobs with scores

**Database Schema**:
```typescript
{
  userId: ObjectId
  jobId: ObjectId
  matchScore: number (0-100)
  matchedSkills: string[]
  missingSkills: string[]
  reasoning: string
  isInterested: boolean
  isApplied: boolean
  matchedAt: Date
}
```

---

### 5. Application Agent Module (`/src/application-agent`)
**Purpose**: Queue-based job application system with AI-generated content

**Features**:
- Queue applications for interested jobs
- Generate personalized cover letters
- Track application status (QUEUED, PROCESSING, COMPLETED, FAILED)
- Retry failed applications
- Process applications in batches

**Configuration**:
```env
AUTO_APPLICATION_ENABLED=false
APPLICATION_AGENT_INTERVAL=1800000  # 30 minutes
```

**API Endpoints**:
- `POST /api/application-agent/queue/:jobId` - Queue application
  - Response: Application queued confirmation
  
- `GET /api/application-agent/my-applications` - Get user applications
  - Query: `status, limit, skip`
  - Response: Applications array with job details
  
- `GET /api/application-agent/:id` - Get application details
  - Response: Full application with generated cover letter
  
- `PATCH /api/application-agent/:id/retry` - Retry failed application
  - Response: Application re-queued
  
- `DELETE /api/application-agent/:id` - Cancel application
  - Response: Application cancelled
  
- `POST /api/application-agent/process-queue` - Process queued applications
  - Query: `limit` (default 10)
  - Response: Processed and failed counts

**Database Schema**:
```typescript
{
  userId: ObjectId
  jobId: ObjectId
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  generatedCoverLetter: string
  resumeUrl: string
  queuedAt: Date
  processedAt: Date
  completedAt: Date
  errorMessage: string
  retryCount: number
  applicationData: object
}
```

---

### 6. Updated User Schema
**New Fields**:
```typescript
{
  phone: string
  skills: string[]
  experience: Array<{
    company: string
    position: string
    duration: string
    description: string
  }>
  education: Array<{
    institution: string
    degree: string
    year: string
  }>
  certifications: string[]
  resumeUrl: string
}
```

---

## Architecture Flow

### Resume Upload Flow:
1. User uploads resume (PDF/DOCX)
2. File is validated and stored (local or S3)
3. Text is extracted from document
4. AI parses text into structured data
5. User profile is automatically updated

### Job Discovery Flow:
1. User triggers job scraping with keywords/location
2. Jobs are scraped from job boards
3. Jobs are saved to database (duplicates prevented)
4. User can search scraped jobs

### Job Matching Flow:
1. User views a job
2. System calculates match score using AI
3. Match includes: score, matched skills, missing skills, reasoning
4. User can mark job as "interested"

### Application Flow:
1. User marks job as interested
2. Application is queued
3. Agent generates personalized cover letter using AI
4. Application is ready for submission
5. Status tracked through queue system

---

## Environment Variables

Complete `.env` file:
```env
# Application
NODE_ENV=development
PORT=8000

# Database
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your_secret
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# Resume Storage
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./uploads/resumes
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Job Scraping
JOB_SCRAPING_ENABLED=true
MAX_JOBS_PER_SCRAPE=50

# Application Agent
AUTO_APPLICATION_ENABLED=false
```

---

## Testing the API

### 1. Test Resume Parser:
```bash
curl -X POST http://localhost:8000/api/resume/parse \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume=@/path/to/resume.pdf"
```

### 2. Test Job Scraping:
```bash
curl -X POST http://localhost:8000/api/jobs/scraper/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["software engineer", "nodejs"], "location": "Remote"}'
```

### 3. Test Job Matching:
```bash
# Calculate match
curl -X POST http://localhost:8000/api/job-matching/calculate/JOB_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get recommendations
curl -X GET http://localhost:8000/api/job-matching/recommendations?limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Test Application Agent:
```bash
# Queue application
curl -X POST http://localhost:8000/api/application-agent/queue/JOB_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Process queue
curl -X POST http://localhost:8000/api/application-agent/process-queue \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Dependencies Added

**Core**:
- `openai` - OpenAI API client
- `@anthropic-ai/sdk` - Anthropic API client
- `@google/generative-ai` - Google Gemini API client

**Resume Parsing**:
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction

**Job Scraping**:
- `axios` - HTTP client
- `cheerio` - HTML parsing
- `puppeteer` - Browser automation (optional)

**Storage**:
- `aws-sdk` - AWS S3 integration
- `multer-s3` - S3 file upload

**Scheduling**:
- `node-cron` - Cron job scheduling

---

## Database Collections

### 1. `users` (updated)
- Added resume parsing fields

### 2. `scrapedjobs` (new)
- Stores jobs from external sources

### 3. `jobmatches` (new)
- Stores user-job match calculations

### 4. `agentapplications` (new)
- Stores queued and processed applications

---

## Security Considerations

1. **File Upload**: 5MB limit, PDF/DOCX only
2. **Authentication**: All endpoints protected with JWT
3. **Rate Limiting**: Configure per job board
4. **API Keys**: Stored in environment variables
5. **Resume Storage**: Supports both local and S3 (encrypted)

---

## Next Steps (Phase 2)

1. Build frontend pages for:
   - Resume upload interface
   - Job recommendations dashboard
   - Interested jobs page
   - Application tracking

2. Implement missing Figma pages

3. Add real-time updates

4. Implement cron jobs for automated scraping

5. Add email notifications

---

## Notes

- All endpoints require JWT authentication
- AI provider can be switched without code changes
- Job scraping respects rate limits and robots.txt
- Application agent is disabled by default (set AUTO_APPLICATION_ENABLED=true to enable)
- For production, use official APIs instead of web scraping where possible

---

## Status: ✅ PHASE 1 COMPLETE

All backend infrastructure is implemented and tested. Backend server is running on port 8000 with all endpoints active.
