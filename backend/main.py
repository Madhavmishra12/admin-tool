from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import List, Optional, Any, Dict
from datetime import datetime, timedelta
import hashlib
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import resend
from resume_parser import ResumeParser
import json
from sqlalchemy.orm import Session
from database import engine, SessionLocal, get_db
import models

# Load environment variables
load_dotenv()
resend.api_key = os.getenv("RESEND_API_KEY")

# Redis Caching Imports
from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

# Create tables
models.Base.metadata.create_all(bind=engine)

# Configuration
SMTP_FROM = os.getenv("SMTP_FROM", "notifications@growqr.ai")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://app.growqr.ai")

app = FastAPI(title="GrowQR Admin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    try:
        redis = aioredis.from_url(redis_url, encoding="utf8", decode_responses=True)
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
        print(f">>> Redis cache initialized at {redis_url}")
    except Exception as e:
        print(f"!!! Failed to initialize Redis cache: {str(e)}")

# Initialization helper
def seed_initial_data():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(models.User).filter(models.User.email == "admin@growqr.ai").first()
        if not admin:
            admin_user = models.User(
                first_name="Admin",
                email="admin@growqr.ai",
                password_hash=hashlib.sha256("Admin@123".encode()).hexdigest(),
                user_type="admin",
                status="active"
            )
            db.add(admin_user)
            db.commit()
            print(">>> Seeded initial admin user: admin@growqr.ai / Admin@123")
    finally:
        db.close()

seed_initial_data()

# === SCHEMAS ===
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


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# === AUTH ===
def _get_logo_base64() -> str:
    """Load GrowQR logo as base64 for embedding in emails"""
    import os, base64
    logo_path = os.path.join(os.path.dirname(__file__), 'static', 'growqr_logo.png')
    try:
        with open(logo_path, 'rb') as f:
            return base64.b64encode(f.read()).decode()
    except Exception:
        return ""

def _build_html_email(name: str, body_text: str, cta_url: str, cta_label: str = "Login to Dashboard") -> str:
    """Build a branded HTML email for GrowQR"""
    logo_b64 = _get_logo_base64()
    logo_img = f'<img src="data:image/png;base64,{logo_b64}" alt="GrowQR" style="height:60px;margin-bottom:8px;" />' if logo_b64 else '<span style="font-size:28px;font-weight:bold;color:#3b3b4f;">Grow<span style="color:#f97316;">QR</span></span>'
    
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td align="center" style="background:#1e1e2e;padding:32px 40px;">
            {logo_img}
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 20px 40px;">
            <h2 style="margin:0 0 12px;color:#1e1e2e;font-size:22px;">Hello, {name}! &#128075;</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.7;">{body_text}</p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td align="center" style="background:#f97316;border-radius:8px;">
                  <a href="{cta_url}" style="display:inline-block;padding:14px 36px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">{cta_label}</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#888;font-size:13px;">Or copy this link into your browser:</p>
            <p style="margin:0 0 24px;color:#f97316;font-size:12px;word-break:break-all;">{cta_url}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px;" />
            <p style="margin:0;color:#aaa;font-size:12px;">This link is secure and unique to you. Do not share it.<br/>If you did not request this email, you can safely ignore it.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="background:#f7f7fa;padding:20px 40px;border-top:1px solid #eee;">
            <p style="margin:0 0 4px;color:#888;font-size:12px;">Powered by</p>
            {logo_img}
            <p style="margin:8px 0 0;color:#aaa;font-size:11px;">&#169; 2025 GrowQR. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

def send_email(to_email: str, subject: str, body: str, name: str = "", cta_url: str = "", cta_label: str = "Login to Dashboard"):
    """Helper to send branded GrowQR email via Resend or SMTP"""
    resend_api_key = os.getenv("RESEND_API_KEY")
    
    # Build HTML email
    html_body = _build_html_email(name or to_email, body, cta_url or "#", cta_label)
    
    if resend_api_key:
        try:
            params = {
                "from": SMTP_FROM,
                "to": [to_email],
                "subject": subject,
                "text": body,
                "html": html_body,
            }
            resend.Emails.send(params)
            print(f">>> Branded GrowQR email sent via Resend to {to_email}")
            return True
        except Exception as e:
            print(f"!!! Failed to send email via Resend to {to_email}: {str(e)}")
    
    # Fallback to SMTP
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM")

    if not all([smtp_host, smtp_port, smtp_user, smtp_password, smtp_from]):
        print(f"!!! No Email Service configured. Log email to: {to_email}")
        print(f"!!! Login URL: {cta_url}")
        return False

    try:
        from email.mime.text import MIMEText
        msg = MIMEMultipart('alternative')
        msg['From'] = smtp_from
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        server = smtplib.SMTP(smtp_host, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        print(f">>> Branded email sent via SMTP to {to_email}")
        return True
    except Exception as e:
        print(f"!!! Failed to send email via SMTP to {to_email}: {str(e)}")
        return False


@app.post('/api/auth/login')
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

@app.post('/api/auth/signup')
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

@app.post('/api/auth/generate-magic-link')
def generate_magic_link(req: Dict[str, str], background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = req.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    print(f"Generating magic link for: {email}")
    
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
    login_url = f"{FRONTEND_URL}/magic-login?token={token}"
    subject = "Your Magic Login Link"
    body = f"Hello,\n\nUse the link below to log in to your dashboard:\n\n{login_url}\n\nThis link is for {display_name} ({email})."
    
    background_tasks.add_task(send_email, email, subject, body)
    
    return {
        "success": True, 
        "token": token, 
        "email_queued": True,
        "message": f"Magic link process started for {email}"
    }

@app.get('/api/auth/verify-magic-link')
def verify_magic_link(token: str, db: Session = Depends(get_db)):
    print(f"Verifying token: {token}")
    magic_token = db.query(models.MagicToken).filter(models.MagicToken.token == token).first()
    if not magic_token:
        print(f"Token not found: {token}")
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    user = db.query(models.User).filter(models.User.email == magic_token.email).first()
    if not user:
        print(f"User not found for token: {token}")
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clean up token after use
    # db.delete(magic_token)
    # db.commit()
    
    return {
        "success": True,
        "token": "session-" + str(uuid.uuid4()),
        "user": user
    }

@app.post('/api/admin/reset')
def reset_database(db: Session = Depends(get_db)):
    print("Resetting database...")
    # Safely delete all data from all tables instead of dropping
    db.query(models.MagicToken).delete()
    db.query(models.UserProfile).delete()
    db.query(models.UseCase).delete()
    db.query(models.Category).delete()
    db.query(models.User).delete()
    db.commit()
    seed_initial_data()
    
    # Invalidate cache
    FastAPICache.clear(namespace="fastapi-cache")
    return {"success": True, "message": "Database cleared and seeded successfully"}

# === DASHBOARD STATS ===
@app.get('/api/dashboard/stats')
@cache(expire=300) # Cache for 5 minutes
def get_dashboard_stats(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    total = len(users)
    active = sum(1 for u in users if u.status == 'active')
    pending = sum(1 for u in users if u.status == 'pending')
    inactive = sum(1 for u in users if u.status == 'inactive')
    
    now = datetime.now()
    users_by_day = []
    for i in range(30):
        day = now - timedelta(days=29-i)
        users_by_day.append({
            'date': day.strftime('%Y-%m-%d'),
            'name': day.strftime('%b %d'),
            'value': sum(1 for u in users if u.created_at.date() == day.date())
        })
    
    return {
        'totalUsers': total,
        'activeUsers': active,
        'pendingUsers': pending,
        'inactiveUsers': inactive,
        'totalCategories': db.query(models.Category).count(),
        'totalUseCases': db.query(models.UseCase).count(),
        'newUsersThisMonth': sum(1 for u in users if u.created_at.month == now.month),
        'newUsersLastMonth': 0,
        'newUsersThisWeek': 0,
        'userGrowthPercent': 0,
        'usersByDay': users_by_day,
        'usersByStatus': [
            {'name': 'Active', 'value': active, 'color': 'hsl(142, 76%, 36%)'},
            {'name': 'Pending', 'value': pending, 'color': 'hsl(38, 92%, 50%)'},
            {'name': 'Inactive', 'value': inactive, 'color': 'hsl(240, 5%, 65%)'},
        ]
    }

# === USERS ===
@app.get('/api/users')
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

@app.get('/api/users/{user_id}')
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    
    u_dict = {c.name: getattr(user, c.name) for c in user.__table__.columns if c.name != 'password_hash'}
    u_dict['role'] = user.user_type
    u_dict['username'] = user.email.split('@')[0] if user.email else 'user'
    return u_dict

@app.post('/api/users')
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

@app.put('/api/users/{user_id}')
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

@app.delete('/api/users/{user_id}')
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
        # Invalidate cache
        FastAPICache.clear(namespace="fastapi-cache")
        return {'success': True}
    raise HTTPException(status_code=404, detail='User not found')

@app.post('/api/users/{user_id}/photo')
async def upload_user_photo(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail='User not found')
    
    # In a real app, save file to storage. Mocking URL for now.
    file_path = f"/uploads/user_{user_id}_{file.filename}"
    db_user.profile_photo_url = file_path
    db.commit()
    
    return {"success": True, "url": file_path}

@app.get('/api/candidates/{candidate_id}')
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == candidate_id).first()
    if not user or user.user_type != "candidate":
        raise HTTPException(status_code=404, detail='Candidate not found')
    
    # Ensure onboarding data exists (matching previous seed logic)
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

@app.post('/api/candidates/{candidate_id}/regenerate-qr')
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

@app.post('/api/candidates/{candidate_id}/reset-login')
def reset_candidate_login(candidate_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == candidate_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Candidate not found')
    
    if user.metadata_fields:
        user.metadata_fields.pop("magic_token", None)
        db.commit()
        
    return {"success": True, "message": "Login access has been reset."}

# === CATEGORIES ===
@app.get('/api/categories')
def list_categories(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Category)
    if search:
        query = query.filter(models.Category.name.ilike(f"%{search}%"))
    return query.all()

@app.post('/api/categories')
def create_category(cat: CategoryCreate, db: Session = Depends(get_db)):
    db_cat = models.Category(**cat.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return {'success': True, 'id': db_cat.id}

# === USE CASES ===
@app.get('/api/use-cases')
def list_use_cases(category_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.UseCase)
    if category_id:
        query = query.filter(models.UseCase.category_id == category_id)
    return query.all()

@app.post('/api/use-cases')
def create_use_case(uc: UseCaseCreate, db: Session = Depends(get_db)):
    db_uc = models.UseCase(**uc.dict())
    db.add(db_uc)
    db.commit()
    db.refresh(db_uc)
    return {'success': True, 'id': db_uc.id}

# === BULK RESUME UPLOAD ===
@app.post('/api/resumes/bulk-upload')
async def bulk_resume_upload(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    results = []
    for file in files:
        filename = file.filename
        clean_name = filename.replace('.pdf', '').replace('_', ' ')
        
        # Parse the PDF for real data
        content = await file.read()
        try:
            parsed_data = ResumeParser.parse(content)
            email = parsed_data.get("email")
            name = parsed_data.get("name") or clean_name.title()
            
            if not email:
                email = f"{clean_name.lower().replace(' ', '.')}@example.com"
                print(f"Warning: No email found in {filename}, using fallback: {email}")
            else:
                print(f"Extracted email from {filename}: {email}")
        except Exception as e:
            print(f"Error parsing {filename}: {str(e)}")
            name = clean_name.title()
            email = f"{clean_name.lower().replace(' ', '.')}@example.com"

        # Check for duplicate in DB
        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            # We still want to send a link to existing users if they re-upload
            token = str(uuid.uuid4())
            magic_token = models.MagicToken(token=token, email=email)
            db.add(magic_token)
            db.commit()
            
            # Send Email
            login_url = f"{FRONTEND_URL}/magic-login?token={token}"
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

        # Create user
        user = models.User(
            first_name=name,
            email=email,
            user_type="candidate",
            status="pending",
            resume={
                "filename": filename,
                "upload_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "file_size": "Unknown", # Could be calculated from content length
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
        
        # Generate magic link for the user
        login_url = f"{FRONTEND_URL}/magic-login?token={token}"
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
    
    # Invalidate cache
    FastAPICache.clear(namespace="fastapi-cache")
    return response

# === USER PROFILE CRUD ===

@app.get('/api/profiles/{user_id}')
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if not profile:
        # Create an empty profile if it doesn't exist
        profile = models.UserProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@app.post('/api/profiles')
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

@app.delete('/api/profiles/{user_id}')
def delete_user_profile(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if profile:
        db.delete(profile)
        db.commit()
    return {"success": True}

if __name__ == '__main__':
    import uvicorn
    import re # Needed for email extraction
    uvicorn.run(app, host='0.0.0.0', port=8000)
