from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: str
    password: Optional[str] = None
    user_type: Optional[str] = "candidate"
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    status: Optional[str] = 'active'
    profile_photo_url: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = 'active'

class UseCaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = 'active'

class CandidateOnboardingUpdate(BaseModel):
    professional_identity: Optional[str] = None
    background_category: Optional[str] = None
    experience_level: Optional[str] = None
    career_objective: Optional[str] = None
    onboarding_completed: Optional[bool] = False

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    professional_summary: Optional[str] = None
    education: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    social_links: Optional[Dict[str, Any]] = None
