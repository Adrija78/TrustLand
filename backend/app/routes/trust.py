from fastapi import APIRouter

from app.models.schemas import TrustScoreInput, TrustScoreResult
from app.services.trust_score import calculate_trust_score

router = APIRouter(prefix="/trust-score", tags=["trust-score"])


@router.post("", response_model=TrustScoreResult)
def score_profile(profile: TrustScoreInput) -> TrustScoreResult:
    return calculate_trust_score(profile)
