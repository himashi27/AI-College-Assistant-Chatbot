import time
from collections import defaultdict, deque

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)
chat_buckets: dict[str, deque] = defaultdict(deque)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def chat_rate_limit_middleware(request, call_next):
    if request.url.path == f"{settings.api_prefix}/chat" and request.method.upper() == "POST":
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - 60
        bucket = chat_buckets[client_ip]

        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= settings.chat_rate_limit_per_minute:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again in a minute."},
            )

        bucket.append(now)

    return await call_next(request)

app.include_router(router, prefix=settings.api_prefix)
