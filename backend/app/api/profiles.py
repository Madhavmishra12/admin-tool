from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import models
from app.schemas.schemas import ProfileUpdate

router = APIRouter(prefix="/api/profiles", tags=["profiles"])

@router.get('/{user_id}')
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if not profile:
        profile = models.UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.post('')
def create_or_update_profile(user_id: int, profile_data: ProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    update_dict = profile_data.dict(exclude_none=True)
    
    if profile:
        for key, value in update_dict.items():
            setattr(profile, key, value)
    else:
        profile = models.UserProfile(user_id=user_id, **update_dict)
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    return {"success": True, "profile": profile}

@router.delete('/{user_id}')
def delete_user_profile(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if profile:
        db.delete(profile)
        db.commit()
    return {"success": True}
