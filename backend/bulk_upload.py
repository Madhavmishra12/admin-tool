from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict
import uuid
import hashlib
from datetime import datetime
import os

from resume_parser import ResumeParser
from database import get_db
import models

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

@router.post('/bulk-upload')
async def bulk_resume_upload(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Bulk upload PDF resumes and create candidate accounts with full metadata storage.
    """
    results = []
    FRONTEND_URL = os.getenv("FRONTEND_URL", "https://app.growqr.ai")
    
    for file in files:
        filename = file.filename
        content = await file.read()
        
        try:
            parsed = ResumeParser.parse(content)
            email = parsed.get("email")
            name = parsed.get("name") or filename.split('.')[0].replace('_', ' ').title()
            
            if not email:
                results.append({"filename": filename, "status": "failed", "error": "No email found"})
                continue
                
            existing = db.query(models.User).filter(models.User.email == email).first()
            if existing:
                results.append({"filename": filename, "status": "duplicate", "user_id": existing.id})
                continue
            
            # Create user with resume metadata
            new_user = models.User(
                first_name=name,
                email=email,
                user_type="candidate",
                status="pending",
                resume={
                    "filename": filename,
                    "upload_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "file_size": f"{len(content)//1024} KB",
                    "url": "#"
                }
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            # Create associated empty profile
            profile = models.UserProfile(user_id=new_user.id)
            db.add(profile)
            db.commit()
            
            results.append({"filename": filename, "status": "success", "user_id": new_user.id})
            
        except Exception as e:
            results.append({"filename": filename, "status": "failed", "error": str(e)})
            
    return {
        "success": True,
        "results": results
    }
