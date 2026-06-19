import type { RiskLevel, TrustScoreResult, UserType } from '../types';

const educationScores: Record<string, number> = {
  'PhD': 20, 'Master': 15, "Master's": 15, 'Bachelor': 12, 'Associate': 8, 'High School': 5, 'Some College': 7, 'Trade School': 6, 'Bootcamp': 5,
};

interface ProfileData {
  user_type?: UserType;
  education?: string;
  certifications?: string[];
  experience_years?: number;
  monthly_income?: number;
  successful_loans?: number;
  portfolio_url?: string;
  rating?: number;
  completed_tasks?: number;
  hackathons?: number;
  internships?: number;
  skills?: string[];
  occupation?: string;
}

export function calculateTrustScore(profile: ProfileData): TrustScoreResult {
  let score = 30; // Base score

  // 1. Repayment History (Critical for all)
  if (profile.successful_loans) {
    score += Math.min(profile.successful_loans * 10, 40); // High impact
  }

  // 2. Income Stability (Important for all)
  if (profile.monthly_income) {
    if (profile.monthly_income >= 10000) score += 20;
    else if (profile.monthly_income >= 5000) score += 15;
    else if (profile.monthly_income >= 3000) score += 10;
    else if (profile.monthly_income >= 1500) score += 5;
    else score += 2;
  }

  // 3. Role-Based Scoring
  if (profile.user_type === 'student') {
    // Students: Education & Potential focused
    if (profile.education && educationScores[profile.education]) {
      score += educationScores[profile.education];
    }
    if (profile.certifications?.length) {
      score += Math.min(profile.certifications.length, 3) * 3;
    }
    if (profile.hackathons) score += Math.min(profile.hackathons * 2, 6);
    if (profile.internships) score += Math.min(profile.internships * 4, 8);
    if (profile.skills?.length) score += Math.min(profile.skills.length, 5) * 1;
  } 
  else if (profile.user_type === 'freelancer') {
    // Freelancers: Experience & Portfolio focused
    if (profile.experience_years) score += Math.min(profile.experience_years * 2, 10);
    if (profile.portfolio_url) score += 5;
    if (profile.rating) score += Math.round(profile.rating * 2); // 5 star = 10 pts
    if (profile.completed_tasks) score += Math.min(profile.completed_tasks * 0.5, 10);
  } 
  else if (profile.user_type === 'gig_worker') {
    // Gig Workers: Stability & Rating focused
    if (profile.experience_years) score += Math.min(profile.experience_years * 1.5, 8);
    if (profile.rating) score += Math.round(profile.rating * 3); // 5 star = 15 pts
    if (profile.completed_tasks) score += Math.min(profile.completed_tasks * 0.2, 10);
  }

  score = Math.min(score, 100);

  const risk: RiskLevel = score >= 75 ? 'low' : score >= 50 ? 'medium' : 'high';
  
  // Calculate Max Loan based on role and score
  let maxLoan = 1000;
  if (score >= 90) maxLoan = 15000;
  else if (score >= 80) maxLoan = 10000;
  else if (score >= 70) maxLoan = 7500;
  else if (score >= 60) maxLoan = 5000;
  else if (score >= 50) maxLoan = 3000;
  else if (score >= 40) maxLoan = 1500;

  // Gig workers and Freelancers get higher scale based on income
  const incomeMultiplier = profile.user_type === 'student' ? 2 : 4;
  if (profile.monthly_income) {
    maxLoan = Math.min(maxLoan, profile.monthly_income * incomeMultiplier);
  }

  let rate = 8;
  if (score >= 90) rate = 3;
  else if (score >= 80) rate = 4;
  else if (score >= 70) rate = 5;
  else if (score >= 60) rate = 6;
  else if (score >= 50) rate = 7;
  else if (score >= 40) rate = 9;
  else rate = 12;

  return { score, risk, maxLoan: Math.round(maxLoan), interestRate: rate };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#14b8a6';
  if (score >= 40) return '#f0b429';
  return '#e11d48';
}

export function getNextTierProgress(loans: number): { current: number; target: number; percentage: number } {
  if (loans >= 10) return { current: 10, target: 10, percentage: 100 };
  if (loans >= 5) return { current: loans, target: 10, percentage: ((loans - 5) / 5) * 100 };
  if (loans >= 3) return { current: loans, target: 5, percentage: ((loans - 3) / 2) * 100 };
  if (loans >= 1) return { current: loans, target: 3, percentage: ((loans - 1) / 2) * 100 };
  return { current: 0, target: 1, percentage: 0 };
}
