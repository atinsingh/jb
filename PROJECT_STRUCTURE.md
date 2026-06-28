# Project Structure

Complete directory structure of the Jobocate AI-powered job search platform.

## Root Directory

```
jobocate/
├── backend/                    # Node.js/Express backend with AI services
├── frontend/                   # React/Next.js frontend
├── figma-pages/               # Design mockups
├── tests/                     # Test files
├── docker-compose.yml         # Docker orchestration
├── .gitignore                # Git ignore rules
├── start.sh                  # Quick start script
├── stop.sh                   # Quick stop script
└── Documentation files
```

## Backend Structure

```
backend/
├── server.js                  # Main Express server
├── package.json              # Dependencies
├── yarn.lock                 # Locked dependencies
├── Dockerfile                # Docker configuration
├── .env                      # Environment variables (not in git)
├── .env.docker              # Docker environment template
└── src/
    ├── ai-services/
    │   └── ai-provider.js           # Multi-provider AI (OpenAI, Anthropic, Google)
    │
    ├── resume-parser/
    │   └── resume-parser.service.js # PDF/DOCX parsing with AI
    │
    ├── job-scraper/
    │   └── job-scraper.service.js   # Indeed job scraping
    │
    ├── job-matching/
    │   └── job-matching.service.js  # AI-powered matching
    │
    ├── application-agent/
    │   └── application-agent.service.js # Auto-apply logic
    │
    ├── models/
    │   ├── User.js              # User model with candidate profile
    │   ├── Job.js               # Job listings
    │   ├── JobMatch.js          # Match scores
    │   └── Application.js       # Application tracking
    │
    ├── routes/
    │   ├── index.js             # Main router
    │   ├── auth.routes.js       # OAuth & profile
    │   ├── resume.routes.js     # Resume parsing
    │   ├── job.routes.js        # Job scraping & search
    │   ├── matching.routes.js   # AI matching
    │   └── application.routes.js # Applications
    │
    └── middleware/
        ├── auth.middleware.js   # JWT authentication
        ├── upload.middleware.js # File upload handling
        └── error.middleware.js  # Error handling
```

## Frontend Structure

```
frontend/
├── pages/                     # Next.js pages
│   ├── index.jsx             # Landing page
│   ├── login/                # Login page
│   ├── signup/               # Signup page
│   ├── auth/
│   │   └── success.jsx       # OAuth callback
│   ├── candidate/            # Candidate dashboard
│   ├── employer/             # Employer dashboard
│   └── pricing/              # Pricing page
│
├── src/
│   ├── components/
│   │   ├── navbar/           # Navigation bar
│   │   ├── footer/           # Footer
│   │   └── common/           # Shared components
│   │
│   ├── context/
│   │   └── AuthContext.jsx   # Authentication context
│   │
│   ├── assets/
│   │   └── advocate_logo.png # Brand logo
│   │
│   └── styles/
│       └── globals.css       # Global styles
│
├── public/                    # Static assets
├── package.json              # Dependencies
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS config
└── Dockerfile                # Docker configuration
```

## Documentation Files

```
docs/
├── README.md                     # Main project README
├── API_DOCUMENTATION.md          # All API endpoints
├── AI_SERVICES_GUIDE.md         # AI services setup & usage
├── DOCKER_SETUP.md              # Docker Compose guide
├── OAUTH_SETUP_INSTRUCTIONS.md  # OAuth configuration
├── GETTING_STARTED.md           # Quick start checklist
├── PHASE1_IMPLEMENTATION.md     # Implementation details
└── PROJECT_STRUCTURE.md         # This file
```

## Configuration Files

### Backend Configuration

**`.env`** (Backend environment variables)
```
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/jobocate
JWT_SECRET=secret_key
FRONTEND_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
EMERGENT_LLM_KEY=...

# Features
JOB_SCRAPING_ENABLED=true
MAX_JOBS_PER_SCRAPE=50
AUTO_APPLICATION_ENABLED=false
MIN_MATCH_SCORE_FOR_AUTO_APPLY=75
MAX_APPLICATIONS_PER_DAY=20
```

**`server.js`** - Main server file
- Express app setup
- MongoDB connection
- Passport OAuth strategies
- Route mounting
- Error handling

### Frontend Configuration

**`package.json`** - Dependencies and scripts
- React 18
- Next.js 15
- Tailwind CSS
- Axios for API calls

**`.env.local`** (Frontend environment variables)
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

### Docker Configuration

**`docker-compose.yml`** - Services orchestration
- MongoDB (database)
- Backend (Node.js API)
- Frontend (React app)
- Networking and volumes

## Key Features by Module

### 1. Authentication (`src/routes/auth.routes.js`)
- Google OAuth 2.0
- LinkedIn OAuth 2.0
- JWT token generation
- Profile management
- User session handling

### 2. Resume Parser (`src/resume-parser/`)
- PDF file upload
- DOCX file upload
- Text extraction
- AI-powered parsing
- Profile auto-population

### 3. Job Scraper (`src/job-scraper/`)
- Indeed job scraping
- Keyword-based search
- Location filtering
- Duplicate prevention
- Configurable limits

### 4. Job Matching (`src/job-matching/`)
- AI match scoring (0-100)
- Skill gap analysis
- Job recommendations
- Batch matching
- Cover letter generation

### 5. Application Agent (`src/application-agent/`)
- Auto-apply logic
- Match threshold filtering
- Daily application limits
- Application tracking
- Status management

## Database Collections

### Users
- Authentication data (Google ID, LinkedIn ID)
- Profile information (name, email, phone, location)
- Skills and experience
- Education history
- Settings (auto-apply, match threshold)

### Jobs
- Job listings (title, company, location)
- Job details (description, requirements, salary)
- Skills required
- Source (Indeed, LinkedIn, Glassdoor)
- Scraping metadata

### JobMatches
- User-Job relationships
- Match scores
- Matched/missing skills
- AI reasoning
- Interest flags

### Applications
- Candidate-Job applications
- Cover letters
- Application status
- Auto-apply flag
- Timestamps

## API Endpoints Summary

### Auth Routes (`/api/auth`)
- `GET /google` - Google OAuth
- `GET /linkedin` - LinkedIn OAuth
- `GET /me` - Get current user
- `PATCH /profile` - Update profile

### Resume Routes (`/api/resume`)
- `POST /parse` - Upload and parse resume
- `GET /data` - Get parsed resume data

### Job Routes (`/api/jobs`)
- `POST /scrape` - Trigger job scraping
- `GET /search` - Search jobs
- `GET /:id` - Get job details
- `GET /` - List all jobs

### Matching Routes (`/api/matching`)
- `POST /calculate/:jobId` - Calculate match
- `GET /matches` - Get all matches
- `PATCH /interest/:jobId` - Mark interested
- `GET /recommendations` - Get AI recommendations
- `POST /batch` - Batch calculate matches

### Application Routes (`/api/applications`)
- `POST /apply/:jobId` - Apply to job
- `GET /` - List applications
- `GET /:id` - Get application details
- `PATCH /:id/status` - Update status
- `POST /auto-apply` - Trigger auto-apply
- `GET /stats/summary` - Get statistics

## Development Workflow

### Local Development (Docker)
```bash
# Start all services
./start.sh

# Or manually
docker-compose up --build

# Stop services
./stop.sh
```

### Without Docker
```bash
# Backend
cd backend
yarn install
yarn dev

# Frontend
cd frontend
yarn install
yarn dev

# MongoDB
mongod --dbpath=/path/to/data
```

## Environment Variables

### Required
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- One AI provider key (OPENAI_API_KEY or EMERGENT_LLM_KEY)

### Optional
- `LINKEDIN_CLIENT_ID` - LinkedIn OAuth client ID
- `LINKEDIN_CLIENT_SECRET` - LinkedIn OAuth secret
- `AI_PROVIDER` - AI provider choice (default: openai)
- `JOB_SCRAPING_ENABLED` - Enable/disable scraping
- `AUTO_APPLICATION_ENABLED` - Enable/disable auto-apply

## Git Ignore Rules

### Ignored Files
- `node_modules/` - Dependencies
- `.env`, `.env.*` - Environment variables
- `.next/`, `build/` - Build outputs
- `uploads/` - Uploaded files
- `*.log` - Log files
- `.DS_Store`, `.idea/`, `.vscode/` - IDE files

### Tracked Files
- Source code (`.js`, `.jsx`)
- Configuration files (`package.json`, `docker-compose.yml`)
- Documentation (`.md` files)
- Public assets
- Docker files (`Dockerfile`, `.dockerignore`)

## Deployment Considerations

### Environment-Specific
- Use separate .env files for dev/staging/prod
- Update OAuth redirect URIs for each environment
- Configure proper CORS origins
- Use HTTPS in production
- Enable MongoDB authentication

### Scaling
- AI services can be deployed separately
- Use Redis for session storage
- Implement API rate limiting
- Add load balancing for multiple instances
- Use CDN for static assets

---

For detailed setup instructions, see:
- [GETTING_STARTED.md](GETTING_STARTED.md)
- [DOCKER_SETUP.md](DOCKER_SETUP.md)
- [AI_SERVICES_GUIDE.md](AI_SERVICES_GUIDE.md)
