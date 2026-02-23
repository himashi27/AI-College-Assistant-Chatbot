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

## Supabase schema

Run `backend/supabase/schema.sql` in your Supabase SQL editor before enabling persistence.
