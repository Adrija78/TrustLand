from app.models.schemas import TrustScoreInput, TrustScoreResult


EDUCATION_SCORES = {
    "PhD": 20,
    "Master": 15,
    "Master's": 15,
    "Bachelor": 12,
    "Associate": 8,
    "Some College": 7,
    "Trade School": 6,
    "Bootcamp": 5,
    "High School": 5,
}


def calculate_trust_score(profile: TrustScoreInput) -> TrustScoreResult:
    score = 30

    if profile.education:
        score += EDUCATION_SCORES.get(profile.education, 0)

    score += min(len(profile.certifications), 3) * 5

    if profile.experience_years:
        score += min(profile.experience_years * 2, 15)

    if profile.monthly_income:
        if profile.monthly_income >= 10000:
            score += 10
        elif profile.monthly_income >= 5000:
            score += 7
        elif profile.monthly_income >= 3000:
            score += 5
        elif profile.monthly_income >= 1500:
            score += 3
        else:
            score += 1

    score += min(profile.successful_loans * 2, 10)

    if profile.user_type == "student":
        score += 3
    elif profile.user_type in {"freelancer", "gig_worker"}:
        score += 2

    score = min(score, 100)
    risk = "low" if score >= 75 else "medium" if score >= 50 else "high"

    if score >= 90:
        max_loan = 15000
    elif score >= 80:
        max_loan = 10000
    elif score >= 70:
        max_loan = 7500
    elif score >= 60:
        max_loan = 5000
    elif score >= 50:
        max_loan = 3000
    elif score >= 40:
        max_loan = 1500
    else:
        max_loan = 1000

    if profile.monthly_income:
        max_loan = min(max_loan, round(profile.monthly_income * 4))

    if score >= 90:
        rate = 3
    elif score >= 80:
        rate = 4
    elif score >= 70:
        rate = 5
    elif score >= 60:
        rate = 6
    elif score >= 50:
        rate = 7
    elif score >= 40:
        rate = 9
    else:
        rate = 12

    return TrustScoreResult(
        score=score,
        risk=risk,
        max_loan_amount=max_loan,
        suggested_interest_rate=rate,
    )
