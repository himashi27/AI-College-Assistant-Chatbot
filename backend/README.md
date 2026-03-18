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
- POST /api/query/route
- POST /api/assignments/parse-due
- GET /api/portal/section/{section_name}?subject={subject_slug_or_alias}
- POST /api/feedback
- POST /api/admin/login
- GET /api/admin/stats (requires `Authorization: Bearer <token>`)
- GET /api/admin/recent-queries (requires `Authorization: Bearer <token>`)
- GET /api/admin/top-intents (requires `Authorization: Bearer <token>`)

## Supabase schema

Run `backend/supabase/schema.sql` in your Supabase SQL editor before enabling persistence.
Then run `backend/supabase/seed.sql` to load baseline subjects, page routes, keywords, and assignments.
Re-run both files after pulling recent changes to create student profile/attendance/performance tables used by DB-first section reads.

## Portal config

- The route and assignment fallback logic now reads `backend/data/portal_config.json`.
- To use a different file, set `PORTAL_CONFIG_PATH` in `backend/.env`.

## Notes

- If Supabase credentials are not configured, the app falls back to in-memory persistence for local development.
- For Supabase-based admin login, set `ADMIN_EMAILS` in `.env` (comma-separated allowed admin emails), then use `POST /api/admin/login` and pass `Authorization: Bearer <token>` on admin endpoints.
- `GET /api/health` includes `persistence_mode`:
  - `supabase` => DB writes are enabled
  - `memory` => local in-memory fallback is active
