from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models import models
from app.core.security import hash_password
from fastapi_cache.decorator import cache
from fastapi_cache import FastAPICache

router = APIRouter(tags=["dashboard"])

@router.post('/api/admin/reset')
def reset_database(db: Session = Depends(get_db)):
    # Circular import prevention: import internally
    from app.main import seed_initial_data
    
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

@router.get('/api/dashboard/stats')
@cache(expire=300)
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
