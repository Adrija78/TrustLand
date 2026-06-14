from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import health, loans, trust, users

settings = get_settings()

app = FastAPI(
    title="TrustLend API",
    description="Backend services for AI trust scoring, wallet profiles, loans, and reputation records.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(trust.router)
app.include_router(users.router)
app.include_router(loans.router)
