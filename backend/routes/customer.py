from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import models
import schemas
from database import get_db
from auth import require_role

router = APIRouter(prefix="/customer", tags=["Customer Dashboard"])

@router.get("/dashboard")
def get_customer_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    # 1. Calculate Stats (with Case-Insensitive Fixes)
    projects_count = db.query(models.Project).filter(models.Project.customer_id == current_user.id).count()
    
    requests_count = db.query(models.ProjectRequest).filter(models.ProjectRequest.customer_id == current_user.id).count()
    
    active_count = db.query(models.Project).filter(
        models.Project.customer_id == current_user.id, 
        func.lower(models.Project.project_status).in_(["active", "in progress", "testing", "delivered", "project started", "agreement"])
    ).count()
    
    completed_count = db.query(models.Project).filter(
        models.Project.customer_id == current_user.id, 
        func.lower(models.Project.project_status).in_(["completed", "paid"])
    ).count()

    # 2. Fetch Recommended Developers (to show on dashboard)
    developers = db.query(models.DeveloperProfile).all()
    dev_list = []
    for dev in developers:
        dev_list.append({
            "id": dev.id,
            "user_id": dev.user_id,
            "name": dev.user.full_name if dev.user else "Unknown",
            "skills": dev.skills or [],
            "experience_years": dev.experience_years,
            "availability": dev.availability,
            "previous_projects": dev.previous_projects or []
        })

    # 3. Return combined data
    return {
        "welcome_name": current_user.full_name,
        "my_projects": projects_count,
        "sent_requests": requests_count,
        "active_projects": active_count,
        "completed_projects": completed_count,
        "recommended_developers": dev_list
    }


@router.get("/projects", response_model=List[schemas.ProjectOut])
def get_customer_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    projects = db.query(models.Project).filter(
        models.Project.customer_id == current_user.id
    ).order_by(models.Project.created_at.desc()).all()
    
    return projects