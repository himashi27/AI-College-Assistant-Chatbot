# AI College Assistant Chatbot

This repository contains a chatbot-first college portal MVP with:

- `Frontend/react-app`: React + Vite frontend
- `backend`: FastAPI backend
- `backend/data/portal_config.json`: dummy portal routing and academic content config

## What Someone Needs To See The Final Output

Opening the GitHub repository only shows the source code.  
To see the actual chatbot and final UI, the project must be deployed:

- frontend on a static hosting platform such as Vercel
- backend on a Python hosting platform such as Render

After deployment, share:

- `Frontend URL`: public chatbot site
- `Backend URL`: public FastAPI API

## Recommended Deployment Setup

### Frontend

Deploy `Frontend/react-app` to Vercel.

Important frontend environment variables:

```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com
VITE_ADMIN_API_KEY=dev-admin-key
VITE_ENABLE_DIRECT_REDIRECT=true
VITE_DEFAULT_STUDENT_ID=AI23001
```

`Frontend/react-app/vercel.json` is included so React Router routes resolve correctly after deployment refreshes.

### Backend

Deploy `backend` to Render.

Important backend environment variables:

```env
APP_NAME=University Chatbot API
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=8000
API_PREFIX=/api
CORS_ORIGINS=https://your-frontend-url.vercel.app
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
```

`render.yaml` is included for the backend service with:

- build command: `pip install -r requirements.txt`
- start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- health check: `/api/health`

## Local Development

### Backend

1. Create and activate a virtual environment
2. Install dependencies
   `pip install -r requirements.txt`
3. Copy env file
   `copy .env.example .env`
4. Start backend
   `uvicorn app.main:app --reload --port 8000`

### Frontend

1. Go to `Frontend/react-app`
2. Install packages
   `npm install`
3. Start frontend
   `npm run dev`

## Backend Endpoints

- `GET /api/health`
- `POST /api/chat`
- `POST /api/query/route`
- `POST /api/assignments/parse-due`
- `GET /api/portal/section/{section_name}`
- `GET /api/portal/quick-actions`
- `GET /api/portal/personas`
- `POST /api/auth/login`
- `POST /api/admin/login`
- `GET /api/admin/stats`
- `GET /api/admin/recent-queries`
- `GET /api/admin/top-intents`
- `POST /api/feedback`

## Supabase Setup

Run these files in your Supabase SQL editor:

- `backend/supabase/schema.sql`
- `backend/supabase/seed.sql`

## Current MVP Scope

- student persona chatbot flow
- faculty persona chatbot flow
- direct routing for attendance, syllabus, assignments, fees, and performance
- deterministic faculty responses for classes, reviews, attendance alerts, and leave requests
- Groq-backed AI fallback for out-of-dataset questions
- chat history by day with session continuity for the current day
