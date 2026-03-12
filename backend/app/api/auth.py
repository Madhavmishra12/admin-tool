from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid
from app.database import get_db
from app.models import models
from app.schemas.schemas import LoginRequest
from app.core.security import hash_password
from app.core.mail import send_email
from app.core.config import settings
from fastapi_cache import FastAPICache

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post('/login')
def login(req: LoginRequest, db: Session = Depends(get_db)):
    password_hash = hash_password(req.password)
    user = db.query(models.User).filter(
        models.User.email == req.email,
        models.User.password_hash == password_hash
    ).first()
    
    if user:
        return {
            'success': True,
            'user': {
                'id': user.id,
                'username': user.email.split('@')[0],
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'role': user.user_type
            },
            'token': 'jwt-token-' + str(uuid.uuid4())
        }
    raise HTTPException(status_code=401, detail='Invalid credentials')

@router.post('/signup')
def signup(req: Dict[str, Any], db: Session = Depends(get_db)):
    email = req.get('email')
    password = req.get('password')
    first_name = req.get('first_name', '')
    last_name = req.get('last_name', '')

    if not email or not password:
        raise HTTPException(status_code=400, detail='Email and password are required')

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')

    new_user = models.User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=hash_password(password),
        user_type='candidate',
        status='active'
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Invalidate cache
    FastAPICache.clear(namespace="fastapi-cache")

    token = 'jwt-token-' + str(uuid.uuid4())
    return {
        'success': True,
        'token': token,
        'user': {
            'id': new_user.id,
            'username': new_user.email.split('@')[0],
            'email': new_user.email,
            'first_name': new_user.first_name,
            'last_name': new_user.last_name,
            'role': new_user.user_type
        }
    }

@router.post('/generate-magic-link')
def generate_magic_link(req: Dict[str, str], background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = req.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Extract name from email if user doesn't exist
    name_part = email.split('@')[0]
    display_name = name_part.replace('.', ' ').replace('_', ' ').title()
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            first_name=display_name,
            email=email,
            user_type="candidate",
            status="active"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    token = str(uuid.uuid4())
    magic_token = models.MagicToken(token=token, email=email)
    db.add(magic_token)
    db.commit()
    
    # Send Real Email (Background)
    login_url = f"{settings.FRONTEND_URL}/magic-login?token={token}"
    subject = "Your Magic Login Link"
    body = f"Hello,\n\nUse the link below to log in to your dashboard:\n\n{login_url}\n\nThis link is for {display_name} ({email})."
    
    background_tasks.add_task(send_email, email, subject, body)
    
    return {
        "success": True, 
        "token": token, 
        "email_queued": True,
        "message": f"Magic link process started for {email}"
    }

@router.get('/verify-magic-link')
def verify_magic_link(token: str, db: Session = Depends(get_db)):
    magic_token = db.query(models.MagicToken).filter(models.MagicToken.token == token).first()
    if not magic_token:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    user = db.query(models.User).filter(models.User.email == magic_token.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "success": True,
        "token": "session-" + str(uuid.uuid4()),
        "user": user
    }
