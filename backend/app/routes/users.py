from fastapi import APIRouter, HTTPException

from app.models.schemas import ProfileUpdate, TrustScoreInput, WalletProfileCreate
from app.services.supabase_client import get_supabase
from app.services.trust_score import calculate_trust_score

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/wallet/{wallet_address}")
def get_or_create_wallet_user(wallet_address: str):
    client = get_supabase()
    existing = client.table("users").select("*").eq("wallet_address", wallet_address).execute()
    if existing.data:
        return existing.data[0]

    created = client.table("users").insert({
        "wallet_address": wallet_address,
        "role": "borrower",
    }).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Could not create user")
    return created.data[0]


@router.post("")
def create_wallet_user(payload: WalletProfileCreate):
    client = get_supabase()
    created = client.table("users").insert(payload.model_dump()).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Could not create user")
    return created.data[0]


@router.patch("/{user_id}")
def update_profile(user_id: str, payload: ProfileUpdate):
    client = get_supabase()
    current_res = client.table("users").select("*").eq("id", user_id).single().execute()
    current = current_res.data
    if not current:
        raise HTTPException(status_code=404, detail="User not found")

    updates = payload.model_dump(exclude_unset=True)
    merged = {**current, **updates}
    score = calculate_trust_score(TrustScoreInput(
        user_type=merged.get("user_type"),
        education=merged.get("education"),
        certifications=merged.get("certifications") or [],
        monthly_income=merged.get("monthly_income"),
        experience_years=merged.get("experience_years"),
        successful_loans=merged.get("successful_loans") or 0,
    ))
    updates.update({
        "trust_score": score.score,
        "risk_category": score.risk,
        "max_loan_amount": score.max_loan_amount,
        "suggested_interest_rate": score.suggested_interest_rate,
    })

    updated = client.table("users").update(updates).eq("id", user_id).execute()
    if not updated.data:
        raise HTTPException(status_code=500, detail="Could not update user")
    return updated.data[0]
