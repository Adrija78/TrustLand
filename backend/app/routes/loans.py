from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException

from app.models.schemas import LoanCreate, RepaymentCreate
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/loans", tags=["loans"])


@router.get("")
def list_loans(borrower_id: str | None = None):
    client = get_supabase()
    query = client.table("loans").select("*, borrower:users!loans_borrower_id_fkey(*)").order("created_at", desc=True)
    if borrower_id:
        query = query.eq("borrower_id", borrower_id)
    return query.execute().data or []


@router.post("")
def create_loan(payload: LoanCreate):
    client = get_supabase()
    borrower = client.table("users").select("*").eq("id", payload.borrower_id).single().execute().data
    if not borrower:
        raise HTTPException(status_code=404, detail="Borrower not found")
    if payload.amount > float(borrower.get("max_loan_amount") or 1000):
        raise HTTPException(status_code=400, detail="Loan amount exceeds trust-score limit")

    due_date = datetime.now(timezone.utc) + timedelta(days=payload.duration_months * 30)
    created = client.table("loans").insert({
        "borrower_id": payload.borrower_id,
        "amount": payload.amount,
        "remaining_amount": payload.amount,
        "purpose": payload.purpose,
        "duration_months": payload.duration_months,
        "interest_rate": borrower.get("suggested_interest_rate") or 8,
        "risk_level": borrower.get("risk_category") or "medium",
        "status": "pending",
        "due_date": due_date.isoformat(),
    }).execute()
    if not created.data:
        raise HTTPException(status_code=500, detail="Could not create loan")
    return created.data[0]


@router.post("/{loan_id}/approve")
def approve_loan(loan_id: str):
    client = get_supabase()
    updated = client.table("loans").update({
        "status": "approved",
        "approved_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", loan_id).execute()
    if not updated.data:
        raise HTTPException(status_code=404, detail="Loan not found")
    return updated.data[0]


@router.post("/{loan_id}/repay")
def repay_loan(loan_id: str, payload: RepaymentCreate):
    client = get_supabase()
    loan = client.table("loans").select("*").eq("id", loan_id).single().execute().data
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    amount_repaid = float(loan.get("amount_repaid") or 0) + payload.amount
    remaining = max(0, float(loan["amount"]) - amount_repaid)
    status = "repaid" if remaining == 0 else "approved"
    updates = {
        "amount_repaid": amount_repaid,
        "remaining_amount": remaining,
        "status": status,
    }
    if status == "repaid":
        updates["repaid_at"] = datetime.now(timezone.utc).isoformat()

    updated = client.table("loans").update(updates).eq("id", loan_id).execute()
    if status == "repaid":
        borrower_id = loan["borrower_id"]
        borrower = client.table("users").select("*").eq("id", borrower_id).single().execute().data
        successful = int(borrower.get("successful_loans") or 0) + 1
        client.table("users").update({
            "successful_loans": successful,
            "total_repaid": float(borrower.get("total_repaid") or 0) + float(loan["amount"]),
        }).eq("id", borrower_id).execute()

    return updated.data[0]
