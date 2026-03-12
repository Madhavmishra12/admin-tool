# GrowQR Admin Panel - Python Backend Setup

## FastAPI Backend for PostgreSQL

Your React frontend is configured to connect to: `http://localhost:8000/api`

### Database Configuration

```python
# Database configuration
DB_CONFIG = {
    'user': 'postgres',
    'host': 'localhost',
    'database': 'growqr_admin',
    'password': 'root@123',
    'port': 5432,
}
```

### 1. Create the backend files

Create a folder `backend/` and add these files:

**backend/main.py**
```python
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Text, JSON, Date, BigInteger, TIMESTAMP, func, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import pandas as pd
import io
import os
from typing import List, Optional
from datetime import datetime, timedelta
import hashlib

# === CONFIG ===
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASS = os.getenv('DB_PASS', 'root@123')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'growqr_admin')

DATABASE_URL = f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# === MODELS ===
class User(Base):
    __tablename__ = 'users'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(50))
    gender = Column(String(20))
    date_of_birth = Column(Date)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    zip_code = Column(String(20))
    status = Column(String(20), default='active')
    metadata = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Category(Base):
    __tablename__ = 'categories'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(20), default='active')
    created_at = Column(TIMESTAMP, server_default=func.now())

class UseCase(Base):
    __tablename__ = 'use_cases'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category_id = Column(BigInteger)
    status = Column(String(20), default='active')
    created_at = Column(TIMESTAMP, server_default=func.now())

class AdminUser(Base):
    __tablename__ = 'admin_users'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(255), nullable=False, unique=True)
    email = Column(String(255))
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default='admin')
    created_at = Column(TIMESTAMP, server_default=func.now())

# Create tables
Base.metadata.create_all(bind=engine)

# === Pydantic schemas ===
class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    status: Optional[str] = 'active'

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = 'active'

class UseCaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    status: Optional[str] = 'active'

app = FastAPI(title="GrowQR Admin API")

# CORS - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# === AUTH ===
@app.post('/api/auth/login')
def login(req: LoginRequest, db: Session = Depends(get_db)):
    password_hash = hash_password(req.password)
    admin = db.query(AdminUser).filter(
        (AdminUser.email == req.email) | (AdminUser.username == req.email),
        AdminUser.password_hash == password_hash
    ).first()
    
    if admin:
        return {
            'success': True,
            'user': {
                'id': admin.id,
                'username': admin.username,
                'email': admin.email,
                'role': admin.role
            }
        }
    raise HTTPException(status_code=401, detail='Invalid credentials')

# === DASHBOARD STATS ===
@app.get('/api/dashboard/stats')
def get_dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(User).count()
    active = db.query(User).filter(User.status == 'active').count()
    pending = db.query(User).filter(User.status == 'pending').count()
    inactive = db.query(User).filter(User.status == 'inactive').count()
    total_categories = db.query(Category).count()
    total_use_cases = db.query(UseCase).count()
    
    # Users by day (last 30 days)
    now = datetime.now()
    users_by_day = []
    for i in range(30):
        day = now - timedelta(days=29-i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
        count = db.query(User).filter(
            User.created_at >= day_start,
            User.created_at <= day_end
        ).count()
        users_by_day.append({
            'date': day.strftime('%Y-%m-%d'),
            'name': day.strftime('%b %d'),
            'value': count
        })
    
    # New users this month vs last month
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1)
    
    new_this_month = db.query(User).filter(User.created_at >= start_of_month).count()
    new_last_month = db.query(User).filter(
        User.created_at >= start_of_last_month,
        User.created_at < start_of_month
    ).count()
    
    # New users this week
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    new_this_week = db.query(User).filter(User.created_at >= start_of_week).count()
    
    growth = ((new_this_month - new_last_month) / max(new_last_month, 1)) * 100 if new_last_month > 0 else 0
    
    return {
        'totalUsers': total,
        'activeUsers': active,
        'pendingUsers': pending,
        'inactiveUsers': inactive,
        'totalCategories': total_categories,
        'totalUseCases': total_use_cases,
        'newUsersThisMonth': new_this_month,
        'newUsersLastMonth': new_last_month,
        'newUsersThisWeek': new_this_week,
        'userGrowthPercent': round(growth, 1),
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
    query = db.query(User)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (User.first_name.ilike(like)) | 
            (User.last_name.ilike(like)) | 
            (User.email.ilike(like))
        )
    total = query.count()
    users = query.order_by(User.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'items': [{
            'id': u.id,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
            'phone': u.phone,
            'gender': u.gender,
            'date_of_birth': str(u.date_of_birth) if u.date_of_birth else None,
            'address': u.address,
            'city': u.city,
            'state': u.state,
            'country': u.country,
            'zip_code': u.zip_code,
            'status': u.status,
            'created_at': str(u.created_at) if u.created_at else None,
            'updated_at': str(u.updated_at) if u.updated_at else None,
        } for u in users]
    }

@app.get('/api/users/{user_id}')
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'phone': user.phone,
        'gender': user.gender,
        'date_of_birth': str(user.date_of_birth) if user.date_of_birth else None,
        'address': user.address,
        'city': user.city,
        'state': user.state,
        'country': user.country,
        'zip_code': user.zip_code,
        'status': user.status,
        'metadata': user.metadata,
        'created_at': str(user.created_at) if user.created_at else None,
        'updated_at': str(user.updated_at) if user.updated_at else None,
    }

@app.post('/api/users')
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(**user.dict(exclude_none=True))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {'success': True, 'id': db_user.id}

@app.put('/api/users/{user_id}')
def update_user(user_id: int, user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail='User not found')
    for key, value in user.dict(exclude_none=True).items():
        setattr(db_user, key, value)
    db.commit()
    return {'success': True}

@app.delete('/api/users/{user_id}')
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail='User not found')
    db.delete(db_user)
    db.commit()
    return {'success': True}

@app.post('/api/users/upload')
def upload_users(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read()
    try:
        if file.filename.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to parse file: {e}')
    
    inserted = 0
    errors = []
    for idx, row in df.iterrows():
        email = str(row.get('email', '')).strip()
        first_name = str(row.get('first_name', '')).strip()
        if not email or not first_name:
            errors.append({'row': int(idx)+1, 'error': 'missing first_name or email'})
            continue
        exists = db.query(User).filter(User.email == email).first()
        if exists:
            errors.append({'row': int(idx)+1, 'error': 'email already exists'})
            continue
        user = User(
            first_name=first_name,
            last_name=row.get('last_name'),
            email=email,
            phone=row.get('phone'),
            status='active'
        )
        db.add(user)
        try:
            db.commit()
            inserted += 1
        except Exception as e:
            db.rollback()
            errors.append({'row': int(idx)+1, 'error': str(e)})
    return {'inserted': inserted, 'errors': errors}

# === CATEGORIES ===
@app.get('/api/categories')
def list_categories(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Category)
    if search:
        query = query.filter(Category.name.ilike(f"%{search}%"))
    categories = query.order_by(Category.id.desc()).all()
    return [{
        'id': c.id,
        'name': c.name,
        'description': c.description,
        'status': c.status,
        'created_at': str(c.created_at) if c.created_at else None,
    } for c in categories]

@app.post('/api/categories')
def create_category(cat: CategoryCreate, db: Session = Depends(get_db)):
    db_cat = Category(**cat.dict(exclude_none=True))
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return {'success': True, 'id': db_cat.id}

@app.put('/api/categories/{cat_id}')
def update_category(cat_id: int, cat: CategoryCreate, db: Session = Depends(get_db)):
    db_cat = db.query(Category).filter(Category.id == cat_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail='Category not found')
    for key, value in cat.dict(exclude_none=True).items():
        setattr(db_cat, key, value)
    db.commit()
    return {'success': True}

@app.delete('/api/categories/{cat_id}')
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    db_cat = db.query(Category).filter(Category.id == cat_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail='Category not found')
    db.delete(db_cat)
    db.commit()
    return {'success': True}

# === USE CASES ===
@app.get('/api/use-cases')
def list_use_cases(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(UseCase)
    if search:
        query = query.filter(
            (UseCase.name.ilike(f"%{search}%")) | 
            (UseCase.description.ilike(f"%{search}%"))
        )
    use_cases = query.order_by(UseCase.id.desc()).all()
    
    # Get category names
    categories = {c.id: c.name for c in db.query(Category).all()}
    
    return [{
        'id': u.id,
        'name': u.name,
        'description': u.description,
        'category_id': u.category_id,
        'category_name': categories.get(u.category_id, 'Unknown'),
        'status': u.status,
        'created_at': str(u.created_at) if u.created_at else None,
    } for u in use_cases]

@app.post('/api/use-cases')
def create_use_case(uc: UseCaseCreate, db: Session = Depends(get_db)):
    db_uc = UseCase(**uc.dict(exclude_none=True))
    db.add(db_uc)
    db.commit()
    db.refresh(db_uc)
    return {'success': True, 'id': db_uc.id}

@app.put('/api/use-cases/{uc_id}')
def update_use_case(uc_id: int, uc: UseCaseCreate, db: Session = Depends(get_db)):
    db_uc = db.query(UseCase).filter(UseCase.id == uc_id).first()
    if not db_uc:
        raise HTTPException(status_code=404, detail='Use case not found')
    for key, value in uc.dict(exclude_none=True).items():
        setattr(db_uc, key, value)
    db.commit()
    return {'success': True}

@app.delete('/api/use-cases/{uc_id}')
def delete_use_case(uc_id: int, db: Session = Depends(get_db)):
    db_uc = db.query(UseCase).filter(UseCase.id == uc_id).first()
    if not db_uc:
        raise HTTPException(status_code=404, detail='Use case not found')
    db.delete(db_uc)
    db.commit()
    return {'success': True}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
```

**backend/resume_parser.py** - PDF Resume Parser Module
```python
import re
import pdfplumber
from typing import Optional, Tuple
from io import BytesIO

class ResumeParser:
    """Parse resume PDFs to extract candidate information"""
    
    # Email regex pattern
    EMAIL_PATTERN = re.compile(
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        re.IGNORECASE
    )
    
    # Phone patterns for various formats
    PHONE_PATTERNS = [
        re.compile(r'\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}'),
        re.compile(r'\(\d{3}\)\s*\d{3}[-.\s]?\d{4}'),
        re.compile(r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'),
    ]
    
    # Common address indicators
    ADDRESS_INDICATORS = ['street', 'st.', 'avenue', 'ave.', 'road', 'rd.', 
                          'drive', 'dr.', 'lane', 'ln.', 'boulevard', 'blvd.',
                          'apt', 'suite', 'floor', 'unit', '#']
    
    @staticmethod
    def extract_text_from_pdf(file_content: bytes) -> str:
        """Extract all text from PDF file"""
        text = ""
        try:
            with pdfplumber.open(BytesIO(file_content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {str(e)}")
        return text
    
    @staticmethod
    def extract_email(text: str) -> Optional[str]:
        """Extract first email address from text"""
        match = ResumeParser.EMAIL_PATTERN.search(text)
        return match.group(0).lower() if match else None
    
    @staticmethod
    def extract_phone(text: str) -> Optional[str]:
        """Extract phone number from text"""
        for pattern in ResumeParser.PHONE_PATTERNS:
            match = pattern.search(text)
            if match:
                return match.group(0)
        return None
    
    @staticmethod
    def extract_name(text: str, email: Optional[str] = None) -> Optional[str]:
        """
        Extract candidate name from resume.
        Uses multiple strategies:
        1. First non-empty line (common resume format)
        2. Text before email on same line
        3. Name pattern matching
        """
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        if not lines:
            return None
        
        # Strategy 1: First line is often the name
        first_line = lines[0]
        
        # Skip if first line looks like a header/title
        skip_words = ['resume', 'cv', 'curriculum', 'vitae', 'profile', 'objective']
        if any(word in first_line.lower() for word in skip_words):
            if len(lines) > 1:
                first_line = lines[1]
        
        # Clean up the name (remove special characters, numbers at start)
        name = re.sub(r'^[\d\W]+', '', first_line)
        name = re.sub(r'[|•·].*$', '', name)  # Remove anything after separators
        name = name.strip()
        
        # Validate: name should be 2-50 chars, contain letters
        if name and 2 <= len(name) <= 50 and re.search(r'[a-zA-Z]', name):
            # Check if it looks like a name (not an email, phone, or address)
            if not ResumeParser.EMAIL_PATTERN.search(name):
                if not any(indicator in name.lower() for indicator in ResumeParser.ADDRESS_INDICATORS):
                    return name
        
        return None
    
    @staticmethod
    def extract_address(text: str) -> Optional[str]:
        """Extract address from resume text"""
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Check for address indicators
            line_lower = line.lower()
            if any(indicator in line_lower for indicator in ResumeParser.ADDRESS_INDICATORS):
                # Clean up the address
                address = re.sub(r'[|•·]', '', line).strip()
                if len(address) > 10:  # Reasonable address length
                    return address[:255]  # Limit length
        
        # Look for patterns like "City, State ZIP"
        zip_pattern = re.compile(r'[A-Za-z]+,?\s+[A-Z]{2}\s+\d{5}(-\d{4})?')
        for line in lines:
            if zip_pattern.search(line):
                return line.strip()[:255]
        
        return None
    
    @classmethod
    def parse(cls, file_content: bytes) -> dict:
        """
        Parse a PDF resume and extract key information.
        
        Returns:
            dict with keys: email, name, phone, address, raw_text
        """
        text = cls.extract_text_from_pdf(file_content)
        
        if not text.strip():
            raise ValueError("PDF appears to be empty or could not be read")
        
        email = cls.extract_email(text)
        name = cls.extract_name(text, email)
        phone = cls.extract_phone(text)
        address = cls.extract_address(text)
        
        return {
            'email': email,
            'name': name,
            'phone': phone,
            'address': address,
            'raw_text': text[:5000]  # Store first 5000 chars for reference
        }
```

**backend/bulk_upload.py** - Bulk Resume Upload API
```python
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import secrets
import string
import hashlib
from datetime import datetime

from resume_parser import ResumeParser

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

def generate_temp_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

@router.post('/bulk-upload')
async def bulk_resume_upload(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Bulk upload PDF resumes and create candidate accounts.
    
    - Parses each PDF to extract email, name, address
    - Creates user accounts with role='candidate'
    - Generates temporary passwords
    - Returns detailed results for each file
    """
    from main import User  # Import here to avoid circular imports
    
    if len(files) > 1000:
        raise HTTPException(
            status_code=400, 
            detail="Maximum 1000 files per upload"
        )
    
    results = []
    
    for file in files:
        result = {
            'filename': file.filename,
            'candidate_name': None,
            'email': None,
            'address': None,
            'status': 'failed',
            'error': None,
            'user_id': None,
            'temp_password': None
        }
        
        try:
            # Validate file type
            if not file.filename.lower().endswith('.pdf'):
                result['error'] = 'Not a PDF file'
                results.append(result)
                continue
            
            # Validate file size (max 10MB per file)
            content = await file.read()
            if len(content) > 10 * 1024 * 1024:
                result['error'] = 'File too large (max 10MB)'
                results.append(result)
                continue
            
            # Parse the PDF
            try:
                parsed = ResumeParser.parse(content)
            except ValueError as e:
                result['error'] = str(e)
                results.append(result)
                continue
            
            # Extract data
            email = parsed.get('email')
            name = parsed.get('name')
            address = parsed.get('address')
            phone = parsed.get('phone')
            
            result['candidate_name'] = name
            result['email'] = email
            result['address'] = address
            
            # Validate email is required
            if not email:
                result['error'] = 'No email found in resume'
                results.append(result)
                continue
            
            # Check for duplicate email
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                result['status'] = 'duplicate'
                result['error'] = 'Email already registered'
                result['user_id'] = existing.id
                results.append(result)
                continue
            
            # Parse name into first/last
            first_name = 'Candidate'
            last_name = None
            if name:
                parts = name.split(None, 1)
                first_name = parts[0] if parts else 'Candidate'
                last_name = parts[1] if len(parts) > 1 else None
            
            # Generate temporary password
            temp_password = generate_temp_password()
            password_hash = hash_password(temp_password)
            
            # Create user account
            new_user = User(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                address=address,
                user_type='candidate',
                status='pending',  # Pending until they change password
                metadata={
                    'source': 'bulk_resume_upload',
                    'uploaded_at': datetime.now().isoformat(),
                    'resume_filename': file.filename,
                    'password_hash': password_hash,
                    'requires_password_change': True
                }
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            result['status'] = 'success'
            result['user_id'] = new_user.id
            result['temp_password'] = temp_password
            
        except Exception as e:
            db.rollback()
            result['error'] = f'Processing error: {str(e)}'
        
        results.append(result)
    
    # Summary stats
    success_count = sum(1 for r in results if r['status'] == 'success')
    failed_count = sum(1 for r in results if r['status'] == 'failed')
    duplicate_count = sum(1 for r in results if r['status'] == 'duplicate')
    
    return {
        'success': True,
        'summary': {
            'total': len(results),
            'created': success_count,
            'failed': failed_count,
            'duplicates': duplicate_count
        },
        'results': results
    }
```

**Add to main.py** - Include the bulk upload router and update User model
```python
# At the top of main.py, add these imports
from bulk_upload import router as bulk_upload_router

# Update the User model to include user_type
class User(Base):
    __tablename__ = 'users'
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(50))
    gender = Column(String(20))
    date_of_birth = Column(Date)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    zip_code = Column(String(20))
    user_type = Column(String(20), default='candidate')  # NEW: admin/business/candidate
    status = Column(String(20), default='active')
    metadata = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

# After creating the FastAPI app, include the router
app.include_router(bulk_upload_router)
```

**backend/requirements.txt** - Updated with PDF parsing dependencies
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pandas==2.1.3
openpyxl==3.1.2
python-multipart==0.0.6
pdfplumber==0.10.3
```

### 2. PostgreSQL Database Setup

Run this SQL in your PostgreSQL to create the tables:

```sql
-- Create database (run as superuser)
CREATE DATABASE growqr_admin;

-- Connect to the database and create tables
\c growqr_admin

-- Users table (with user_type column)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    gender VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    zip_code VARCHAR(20),
    user_type VARCHAR(20) DEFAULT 'candidate',  -- admin/business/candidate
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add user_type column if table already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'candidate';

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Use cases table
CREATE TABLE IF NOT EXISTS use_cases (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id BIGINT REFERENCES categories(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, email, password_hash, role)
VALUES ('admin', 'admin@growqr.com', '240be518fabd2724ddb6f04eeb9d5b0c5a9c0c76e91f5f0a12d0e9c8b7a6f5e4', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_use_cases_category ON use_cases(category_id);
```

### 3. Run the Python Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Test the API

- **API Docs**: http://localhost:8000/docs
- **Login**: POST http://localhost:8000/api/auth/login
  - Body: `{"email": "admin@growqr.com", "password": "admin123"}`

### 5. Environment Variables (Optional)

You can override database settings with environment variables:

```bash
export DB_USER=postgres
export DB_PASS=root@123
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=growqr_admin
```

### 6. Frontend Configuration

Make sure your frontend is configured to call `http://localhost:8000/api` for API requests. The current setup in `src/lib/api.ts` should already have this configured.
