"""
FastAPI application entry point
"""

import base64
import logging
import secrets
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request

# ログ設定（INFO以上をCloudWatch Logsに出力）
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
import bugsnag
from bugsnag.asgi import BugsnagMiddleware
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from .config import get_settings
from .routers import admin, auth, data, faq, improvements, internal, rules
from .routers import settings as settings_router
from .services.rag_chatbot import RAGChatbotService
from .services.ticket_rag import TicketRAGService
from .services.settings_manager import init_settings_manager


class BasicAuthMiddleware(BaseHTTPMiddleware):
    """Basic認証ミドルウェア"""

    def __init__(self, app, username: str, password: str):
        super().__init__(app)
        self.username = username
        self.password = password

    async def dispatch(self, request: Request, call_next):
        # ヘルスチェックはBasic認証をスキップ
        if request.url.path in ["/health", "/"]:
            return await call_next(request)

        # OPTIONSリクエスト（CORS preflight）はスキップ
        if request.method == "OPTIONS":
            return await call_next(request)

        # X-Basic-Auth または Authorization ヘッダーをチェック
        auth_header = request.headers.get("X-Basic-Auth") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Basic "):
            try:
                credentials = base64.b64decode(auth_header[6:]).decode("utf-8")
                username, password = credentials.split(":", 1)
                if secrets.compare_digest(username, self.username) and \
                   secrets.compare_digest(password, self.password):
                    return await call_next(request)
            except Exception:
                pass

        return Response(
            content="Authentication required",
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="Secure Area"'},
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    # Initialize settings manager
    app_settings = get_settings()
    init_settings_manager(
        data_base_path=app_settings.data_base_path,
        anthropic_api_key=app_settings.anthropic_api_key,
        openai_api_key=app_settings.openai_api_key,
    )
    print("Settings manager initialized")

    # Initialize Bugsnag if API key is configured
    if app_settings.bugsnag_api_key:
        bugsnag.configure(
            api_key=app_settings.bugsnag_api_key,
            project_root="/app",
            release_stage=app_settings.environment,
            app_version="2.0.0",
        )
        print("Bugsnag initialized")
    else:
        print("Bugsnag not configured (BUGSNAG_API_KEY not set)")

    # Initialize Sentry if DSN is configured
    if app_settings.sentry_dsn:
        sentry_sdk.init(
            dsn=app_settings.sentry_dsn,
            environment=app_settings.environment,
            release="2.0.0",
            traces_sample_rate=0.1 if app_settings.environment == "production" else 1.0,
            integrations=[
                StarletteIntegration(),
                FastApiIntegration(),
            ],
        )
        print("Sentry initialized")
    else:
        print("Sentry not configured (SENTRY_DSN not set)")

    # RAG services are initialized lazily on first request
    print("Server starting... (RAG models will load on first request)")
    yield
    print("Shutting down...")


app = FastAPI(
    title="Bachelor Chat Bot API",
    description="RAG-based FAQ and Internal Support Tool API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS configuration
settings = get_settings()
origins = [origin.strip() for origin in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic認証ミドルウェア（無効化する場合はコメントアウト）
# app.add_middleware(
#     BasicAuthMiddleware,
#     username=settings.basic_auth_user,
#     password=settings.basic_auth_password,
# )

# Include routers
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(faq.router)
app.include_router(improvements.router)
app.include_router(internal.router)
app.include_router(settings_router.router)
app.include_router(data.router)
app.include_router(rules.router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Bachelor Chat Bot API"}


@app.get("/health")
async def health():
    """Health check endpoint for load balancer"""
    return {"status": "healthy"}


# Bugsnag middleware for error tracking (must be applied after all routes)
if settings.bugsnag_api_key:
    app = BugsnagMiddleware(app)
