# Backend (FastAPI MVP)

This folder contains the initial backend service for the university chatbot.

## Quick start

1. Create and activate a virtual environment.
2. Install dependencies:
   pip install -r requirements.txt
   For tests:
   pip install -r requirements-dev.txt
3. Copy environment variables:
   copy .env.example .env
4. Run the server:
   uvicorn app.main:app --reload --port 8000
5. Run tests:
   pytest -q

## Endpoints

- GET /api/health
- POST /api/chat
- POST /api/feedback
- GET /api/admin/stats (requires `x-admin-key`)
- GET /api/admin/recent-queries (requires `x-admin-key`)
- GET /api/admin/top-intents (requires `x-admin-key`)

## Supabase schema

Run `backend/supabase/schema.sql` in your Supabase SQL editor before enabling persistence.

## Notes

- If Supabase credentials are not configured, the app falls back to in-memory persistence for local development.
- Set `ADMIN_API_KEY` in `.env` and pass it as `x-admin-key` header for admin endpoints.
