from pydantic import BaseModel, Field


class TrustScoreInput(BaseModel):
    user_type: str | None = None
    education: str | None = None
    certifications: list[str] = Field(default_factory=list)
    monthly_income: float | None = Field(default=None, ge=0)
    experience_years: int | None = Field(default=None, ge=0)
    successful_loans: int = Field(default=0, ge=0)


class TrustScoreResult(BaseModel):
    score: int
    risk: str
    max_loan_amount: int
    suggested_interest_rate: float


class WalletProfileCreate(BaseModel):
    wallet_address: str
    role: str = "borrower"


class ProfileUpdate(BaseModel):
    name: str | None = None
    user_type: str | None = None
    education: str | None = None
    certifications: list[str] | None = None
    monthly_income: float | None = Field(default=None, ge=0)
    experience_years: int | None = Field(default=None, ge=0)


class LoanCreate(BaseModel):
    borrower_id: str
    amount: float = Field(gt=0)
    purpose: str
    duration_months: int = Field(gt=0, le=36)


class RepaymentCreate(BaseModel):
    amount: float = Field(gt=0)
