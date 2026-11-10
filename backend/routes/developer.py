from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func # <-- Import this
from typing import List
import models
import schemas
from database import get_db
from auth import require_role

router = APIRouter(prefix="/developer", tags=["Developer"])

# 1. GET current developer's profile
@router.get("/profile", response_model=schemas.DeveloperProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    profile = db.query(models.DeveloperProfile).filter(models.DeveloperProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

# 2. CREATE a profile (POST)
@router.post("/profile", response_model=schemas.DeveloperProfileOut)
def create_profile(
    profile: schemas.DeveloperProfileCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    existing = db.query(models.DeveloperProfile).filter(models.DeveloperProfile.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists. Use PUT to update.")

    projects_dict = [p.model_dump() for p in profile.previous_projects]
    
    new_profile = models.DeveloperProfile(
        user_id=current_user.id,
        bio=profile.bio,
        skills=profile.skills,
        previous_projects=projects_dict,
        experience_years=profile.experience_years,
        education=profile.education,
        github_link=profile.github_link,
        linkedin_link=profile.linkedin_link,
        availability=profile.availability,
        expected_budget=profile.expected_budget,
        profile_photo_url=profile.profile_photo_url
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile

# 3. UPDATE profile (PUT)
@router.put("/profile", response_model=schemas.DeveloperProfileOut)
def update_profile(
    profile_update: schemas.DeveloperProfileCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    profile = db.query(models.DeveloperProfile).filter(models.DeveloperProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    projects_dict = [p.model_dump() for p in profile_update.previous_projects]

    profile.bio = profile_update.bio
    profile.skills = profile_update.skills
    profile.previous_projects = projects_dict
    profile.experience_years = profile_update.experience_years
    profile.education = profile_update.education
    profile.github_link = profile_update.github_link
    profile.linkedin_link = profile_update.linkedin_link
    profile.availability = profile_update.availability
    profile.expected_budget = profile_update.expected_budget
    profile.profile_photo_url = profile_update.profile_photo_url

    db.commit()
    db.refresh(profile)
    return profile

# 4. GET ALL developers (for customers to browse)
@router.get("/all", response_model=List[schemas.DeveloperProfileOut])
def get_all_developers(db: Session = Depends(get_db)):
    return db.query(models.DeveloperProfile).all()

# 5. DASHBOARD STATS (FIXED)
@router.get("/dashboard")
def get_developer_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    profile = db.query(models.DeveloperProfile).filter(models.DeveloperProfile.user_id == current_user.id).first()
    
    # Base query for this developer's requests
    req_query = db.query(models.ProjectRequest).filter(models.ProjectRequest.developer_id == current_user.id)

    # Calculate stats based on ProjectRequest status
    incoming = req_query.filter(func.lower(models.ProjectRequest.status) == "pending").count()
    accepted = req_query.filter(func.lower(models.ProjectRequest.status) == "accepted").count()
    rejected = req_query.filter(func.lower(models.ProjectRequest.status) == "rejected").count()
    
    # FIX: For Active and Completed, we must look at the Project table
    # because the ProjectRequest status stays "Active" even after completion.
    active_projects = db.query(models.Project).join(models.ProjectRequest).filter(
        models.ProjectRequest.developer_id == current_user.id,
        func.lower(models.Project.project_status).in_(["active", "in progress", "testing", "delivered", "project started", "agreement"])
    ).count()

    completed_projects = db.query(models.Project).join(models.ProjectRequest).filter(
        models.ProjectRequest.developer_id == current_user.id,
        func.lower(models.Project.project_status).in_(["completed", "paid"])
    ).count()

    return {
        "welcome_name": current_user.full_name,
        "has_profile": profile is not None,
        "incoming_requests": incoming,
        "accepted_projects": accepted,
        "rejected_requests": rejected,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
    }