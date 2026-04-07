# AI College Assistant Chatbot

A chatbot-first college portal MVP built to demonstrate how students and staff can access academic information through natural language queries instead of manually navigating a complex portal.

## Live Demo
- Frontend: https://ai-college-assistant-chatbot.vercel.app
- Backend API: https://ai-college-assistant-chatbot.onrender.com
- Backend Health Check: https://ai-college-assistant-chatbot.onrender.com/api/health

## Project Overview
This project is a prototype college assistant system where the chatbot is the main interaction layer.

Users can:
- log in as `Student` or `Staff`
- verify portal access through OTP-based login flow
- ask academic and portal-related questions in natural language
- get direct routing for fixed portal sections like attendance, syllabus, assignments, fees, and results
- use AI fallback for questions outside the configured portal dataset

The prototype is built on a dummy portal so the chatbot logic can later be transferred to the final college website with minimal disruption.

## Key Features

### 1. OTP-Based Authentication
- Separate login entry for `Student` and `Staff`
- OTP verification flow before portal access
- Role-aware Outlook ID mapping
- Blocked users are denied access by admin policy

Note: in the current MVP, OTP is shown on-screen as a test OTP for prototype use. In the final deployment, the same flow can be connected to real Outlook/email delivery.

### 2. Chatbot-First Academic Navigation
The chatbot handles direct portal queries such as:
- `attendance of dbms`
- `syllabus of all subjects`
- `due assignment for neural networks`
- `show my classes for today`
- `show pending leave requests`

For supported queries, the chatbot routes directly to the correct section without unnecessary search delay.

### 3. AI Fallback for Open Questions
If a user asks a conceptual or out-of-dataset question such as:
- `what is normalization`
- `explain dbms briefly`

The system uses Groq-backed LLM fallback to generate a response.

### 4. Persona-Aware Experience
Supported personas:
- `Student`
- `Faculty / Staff`

Student flow supports:
- attendance
- syllabus
- assignments
- fees
- performance/results

Faculty flow supports:
- class schedule
- pending assignment reviews
- low attendance alerts
- leave requests

### 5. Admin Dashboard
Admin tools include:
- user account verification and blocking
- misuse / inappropriate query review
- announcements and alerts
- student/staff feedback review
- recent query monitoring
- top intent monitoring

### 6. Chat History and Session Continuity
- current-day chat remains active during the same login session
- history drawer shows previous conversations
- new day starts a fresh active conversation

## Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS

### Backend
- FastAPI
- Python
- Uvicorn

### Database / Persistence
- Supabase
- PostgreSQL
- JSON-based portal configuration for prototype routing/content

### AI Layer
- Groq API for LLM fallback
- rule-based intent routing for deterministic portal actions

## Project Structure
```text
Frontend/react-app        React frontend
backend                   FastAPI backend
backend/data              Portal config and routing dataset
backend/supabase          Supabase schema and seed files
render.yaml               Render deployment config
```

## Live Deployment Architecture
- Frontend deployed on `Vercel`
- Backend deployed on `Render`
- Database/persistence on `Supabase`

## Environment Variables

### Frontend
```env
VITE_API_BASE_URL=https://ai-college-assistant-chatbot.onrender.com
VITE_ADMIN_API_KEY=dev-admin-key
VITE_ENABLE_DIRECT_REDIRECT=true
VITE_DEFAULT_STUDENT_ID=AI23001
```

### Backend
```env
APP_NAME=University Chatbot API
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=8000
API_PREFIX=/api
CORS_ORIGINS=https://ai-college-assistant-chatbot.vercel.app
REQUEST_TIMEOUT_SECONDS=20
SUPABASE_TIMEOUT_SECONDS=10
CHAT_RATE_LIMIT_PER_MINUTE=30
DEFAULT_MODEL=llama-3.1-8b-instant
LLM_PROVIDER=groq
GROQ_API_KEY=YOUR_GROQ_API_KEY
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_KEY=YOUR_SUPABASE_KEY
ADMIN_API_KEY=dev-admin-key
ADMIN_EMAILS=hihimanshi2957@gmail.com
PORTAL_CONFIG_PATH=data/portal_config.json
OTP_EXPIRY_SECONDS=300
OTP_DEMO_MODE=true
```

## Local Setup

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd Frontend/react-app
npm install
npm run dev
```

## Supabase Setup
Run these files in Supabase SQL Editor:
- `backend/supabase/schema.sql`
- `backend/supabase/seed.sql`

## Important API Endpoints
- `GET /api/health`
- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/chat`
- `POST /api/query/route`
- `POST /api/assignments/parse-due`
- `GET /api/portal/section/{section_name}`
- `GET /api/portal/quick-actions`
- `GET /api/portal/personas`
- `POST /api/admin/login`
- `GET /api/admin/stats`
- `GET /api/admin/recent-queries`
- `GET /api/admin/top-intents`
- `POST /api/feedback`

## Current MVP Scope
Completed in the current version:
- student chatbot flow
- faculty chatbot flow
- OTP-based prototype login
- admin dashboard tools
- recent queries and intent tracking
- announcements and feedback review flow
- chatbot history with same-day continuity
- deployed frontend and backend

## Future Scope
- real Outlook/email OTP delivery
- final integration into the official college portal
- richer ERP/live database sync
- expanded staff workflows
- parent/guardian portal flow if required later

## Repository Usage
If someone opens this GitHub repository, they can:
1. read the source code
2. open the live deployed frontend from the link above
3. review backend health/API availability from the Render links

---

Built as a chatbot-centered academic assistance prototype for college portal integration.
