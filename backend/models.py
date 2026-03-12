from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True) # Storing as string to match schema
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    country = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    user_type = Column(String, default="candidate") # admin, business, candidate
    status = Column(String, default="active") # active, pending, inactive
    profile_photo_url = Column(String, nullable=True)
    
    # JSON fields for flexible data
    onboarding = Column(JSON, nullable=True)
    resume = Column(JSON, nullable=True)
    metadata_fields = Column(JSON, nullable=True) # Rename from metadata to avoid conflict
    
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship
    profile = relationship("UserProfile", back_populates="user", uselist=False)

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UseCase(Base):
    __tablename__ = "use_cases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, nullable=True) # Linked to Category.id
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MagicToken(Base):
    __tablename__ = "magic_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    email = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True)
    bio = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True) # List of skills
    professional_summary = Column(Text, nullable=True)
    education = Column(JSON, nullable=True) # List of education objects
    experience = Column(JSON, nullable=True) # List of experience objects
    social_links = Column(JSON, nullable=True) # Object with social media links
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="profile")
