from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import uuid
from app.database import get_db
from app.models import models
from app.schemas.schemas import UserCreate
from app.core.security import hash_password
from fastapi_cache import FastAPICache

router = APIRouter(prefix="/api", tags=["users"])

@router.get('/users')
def list_users(page: int = 1, page_size: int = 10, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.User)
    if search:
        query = query.filter(
            (models.User.first_name.ilike(f"%{search}%")) | 
            (models.User.email.ilike(f"%{search}%"))
        )
    
    total = query.count()
    users = query.order_by(models.User.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    mapped_users = []
    for u in users:
        u_dict = {c.name: getattr(u, c.name) for c in u.__table__.columns if c.name != 'password_hash'}
        u_dict['role'] = u.user_type
        u_dict['username'] = u.email.split('@')[0] if u.email else 'user'
        mapped_users.append(u_dict)
        
    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'items': mapped_users
    }

@router.get('/users/{user_id}')
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    
    u_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns if c.name != 'password_hash'}
    u_dict['role'] = user.user_type
    u_dict['username'] = user.email.split('@')[0] if user.email else 'user'
    return u_dict

@router.post('/users')
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    user_data = user.dict()
    
    password = user_data.pop('password', None)
    if password:
        user_data['password_hash'] = hash_password(password)
        
    existing = db.query(models.User).filter(models.User.email == user_data['email']).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_user = models.User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Invalidate cache
    FastAPICache.clear(namespace="fastapi-cache")
    
    return {
        'success': True, 
        'id': db_user.id,
        'email': db_user.email,
        'first_name': db_user.first_name,
        'last_name': db_user.last_name,
        'role': db_user.user_type
    }

@router.put('/users/{user_id}')
def update_user(user_id: int, user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail='User not found')
    
    update_data = user.dict(exclude_none=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()

    # Invalidate cache
    FastAPICache.clear(namespace="fastapi-cache")
    return {'success': True}

@router.delete('/users/{user_id}')
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
        # Invalidate cache
        FastAPICache.clear(namespace="fastapi-cache")
        return {'success': True}
    raise HTTPException(status_code=404, detail='User not found')

@router.post('/users/{user_id}/photo')
async def upload_user_photo(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail='User not found')
    
    file_path = f"/uploads/user_{user_id}_{file.filename}"
    db_user.profile_photo_url = file_path
    db.commit()
    
    return {"success": True, "url": file_path}

@router.get('/candidates/{candidate_id}')
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == candidate_id).first()
    if not user or user.user_type != "candidate":
        raise HTTPException(status_code=404, detail='Candidate not found')
    
    if not user.onboarding:
        user.onboarding = {
            "professional_identity": "Full Stack Developer",
            "background_category": "Software Engineering",
            "experience_level": "Senior (5+ years)",
            "career_objective": "Looking to lead innovation in AI-driven platforms.",
            "onboarding_step": 3,
            "onboarding_completed": True
        }
    
    if not user.resume:
        user.resume = {
            "filename": f"resume_{user.first_name.lower().replace(' ', '_')}.pdf",
            "upload_date": user.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "file_size": "1.2 MB",
            "url": "#"
        }
        
    return user

@router.post('/candidates/{candidate_id}/regenerate-qr')
def regenerate_candidate_qr(candidate_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == candidate_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Candidate not found')
    
    token = str(uuid.uuid4())
    magic_token = models.MagicToken(token=token, email=user.email)
    db.add(magic_token)
    
    if not user.metadata_fields:
        user.metadata_fields = {}
    
    user.metadata_fields["magic_token"] = token
    db.commit()
    return {"success": True, "token": token}

@router.post('/candidates/{candidate_id}/reset-login')
def reset_candidate_login(candidate_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == candidate_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Candidate not found')
    
    if user.metadata_fields:
        user.metadata_fields.pop("magic_token", None)
        db.commit()
        
    return {"success": True, "message": "Login access has been reset."}
