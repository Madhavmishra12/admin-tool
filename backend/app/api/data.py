from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import models
from app.schemas.schemas import CategoryCreate, UseCaseCreate

router = APIRouter(prefix="/api", tags=["data"])

@router.get('/categories')
def list_categories(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Category)
    if search:
        query = query.filter(models.Category.name.ilike(f"%{search}%"))
    return query.all()

@router.post('/categories')
def create_category(cat: CategoryCreate, db: Session = Depends(get_db)):
    db_cat = models.Category(**cat.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return {'success': True, 'id': db_cat.id}

@router.get('/use-cases')
def list_use_cases(category_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.UseCase)
    if category_id:
        query = query.filter(models.UseCase.category_id == category_id)
    return query.all()

@router.post('/use-cases')
def create_use_case(uc: UseCaseCreate, db: Session = Depends(get_db)):
    db_uc = models.UseCase(**uc.dict())
    db.add(db_uc)
    db.commit()
    db.refresh(db_uc)
    return {'success': True, 'id': db_uc.id}
