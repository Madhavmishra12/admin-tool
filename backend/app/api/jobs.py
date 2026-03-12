from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime
from app.database import get_db
from app.models import models
from app.core.mail import send_email
from app.core.config import settings
from resume_parser import ResumeParser
from fastapi_cache import FastAPICache

router = APIRouter(prefix="/api/resumes", tags=["jobs"])

@router.post('/bulk-upload')
async def bulk_resume_upload(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    results = []
    for file in files:
        filename = file.filename
        clean_name = filename.replace('.pdf', '').replace('_', ' ')
        
        content = await file.read()
        try:
            parsed_data = ResumeParser.parse(content)
            email = parsed_data.get("email")
            name = parsed_data.get("name") or clean_name.title()
            
            if not email:
                email = f"{clean_name.lower().replace(' ', '.')}@example.com"
            else:
                print(f"Extracted email from {filename}: {email}")
        except Exception as e:
            print(f"Error parsing {filename}: {str(e)}")
            name = clean_name.title()
            email = f"{clean_name.lower().replace(' ', '.')}@example.com"

        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            token = str(uuid.uuid4())
            magic_token = models.MagicToken(token=token, email=email)
            db.add(magic_token)
            db.commit()
            
            login_url = f"{settings.FRONTEND_URL}/magic-login?token={token}"
            subject = "Dashboard Login Link"
            body = f"Hello {existing.first_name},\n\nYour resume was re-uploaded. You can access your dashboard here:\n\n{login_url}"
            background_tasks.add_task(send_email, email, subject, body, existing.first_name, login_url, "Access Dashboard")

            results.append({
                "filename": filename,
                "candidate_name": existing.first_name,
                "email": email,
                "status": "duplicate",
                "user_id": existing.id,
                "magic_token": token,
                "email_sent": True
            })
            continue

        user = models.User(
            first_name=name,
            email=email,
            user_type="candidate",
            status="pending",
            resume={
                "filename": filename,
                "upload_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "file_size": "Unknown",
                "url": "#" 
            }
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        token = str(uuid.uuid4())
        magic_token = models.MagicToken(token=token, email=email)
        db.add(magic_token)
        db.commit()
        
        login_url = f"{settings.FRONTEND_URL}/magic-login?token={token}"
        subject = "Welcome! Your Dashboard Login Link"
        body = f"Hello {name},\n\nYour resume has been processed. Use the link below to access your dashboard:\n\n{login_url}\n\nEmail: {email}"
        
        background_tasks.add_task(send_email, email, subject, body, name, login_url, "Access Your Dashboard")

        results.append({
            "filename": filename,
            "candidate_name": name,
            "email": email,
            "status": "success",
            "user_id": user.id,
            "magic_token": token,
            "email_sent": True
        })

    response = {
        "success": True,
        "summary": {
            "total": len(files),
            "created": sum(1 for r in results if r["status"] == "success"),
            "duplicates": sum(1 for r in results if r["status"] == "duplicate"),
            "failed": 0
        },
        "results": results
    }
    
    FastAPICache.clear(namespace="fastapi-cache")
    return response
