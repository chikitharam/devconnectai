from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import re
import models
from database import get_db
from auth import require_role

# Removed the prefix so the route matches exactly /projects/{id}/recommendations
router = APIRouter(tags=["Matching Engine"])

def calculate_skill_score(required_skills, dev_skills):
    if not required_skills:
        return 100
    if not dev_skills:
        return 0
    
    req_lower = [s.lower() for s in required_skills]
    dev_lower = [s.lower() for s in dev_skills]
    
    matched = set(req_lower).intersection(set(dev_lower))
    return (len(matched) / len(req_lower)) * 100

def calculate_project_relevance(required_skills, previous_projects):
    if not required_skills:
        return 100
    if not previous_projects:
        return 50 
    
    project_text = " ".join([
        f"{p.get('name', '')} {p.get('description', '')}".lower() 
        for p in previous_projects
    ])
    
    req_lower = [s.lower() for s in required_skills]
    matches = sum(1 for skill in req_lower if skill in project_text)
    
    return (matches / len(req_lower)) * 100

def calculate_experience_score(years):
    return min(years * 20, 100)

def calculate_budget_score(project_budget_str, dev_budget):
    if not project_budget_str or not dev_budget:
        return 50 
        
    numbers = [int(s) for s in re.findall(r'\d+', project_budget_str)]
    if not numbers:
        return 50
        
    max_project_budget = max(numbers)
    
    if dev_budget <= max_project_budget:
        return 100 
    elif dev_budget <= max_project_budget * 1.2:
        return 75  
    else:
        return 20  

def generate_reasons(dev, breakdown):
    reasons = []
    
    if breakdown["skills"] >= 80:
        reasons.append("Matches most required technical skills.")
    elif breakdown["skills"] > 0:
        reasons.append("Matches some of the required technical skills.")
        
    if breakdown["projects"] >= 50:
        reasons.append("Has previous project experience related to your needs.")
        
    if breakdown["experience"] >= 60:
        reasons.append(f"Has {dev.experience_years} years of relevant industry experience.")
        
    if breakdown["availability"] == 100:
        reasons.append("Currently available to start immediately.")
    else:
        reasons.append("Currently busy, but has the right skills.")

    if breakdown["budget"] >= 80:
        reasons.append("Expected rate aligns well with your budget.")
    elif breakdown["budget"] <= 20:
        reasons.append("Expected rate may exceed your stated budget.")

    return reasons

@router.get("/projects/{project_id}/recommendations")
def match_developers(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    project = db.query(models.Project).filter(
        models.Project.project_id == project_id,
        models.Project.customer_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.requirements_approved or not project.ai_analysis:
        raise HTTPException(status_code=400, detail="Project requirements must be approved before matching.")

    required_skills = project.ai_analysis.get("required_skills", [])
    
    developers = db.query(models.DeveloperProfile).all()
    matched_developers = []

    for dev in developers:
        skill_score = calculate_skill_score(required_skills, dev.skills)
        project_score = calculate_project_relevance(required_skills, dev.previous_projects)
        exp_score = calculate_experience_score(dev.experience_years)
        avail_score = 100 if dev.availability == "Available" else 40
        budget_score = calculate_budget_score(project.budget, dev.expected_budget)
        
        final_score = (
            (0.40 * skill_score) +
            (0.25 * project_score) +
            (0.15 * exp_score) +
            (0.10 * avail_score) +
            (0.10 * budget_score)
        )

        breakdown = {
            "skills": round(skill_score),
            "projects": round(project_score),
            "experience": round(exp_score),
            "availability": round(avail_score),
            "budget": round(budget_score)
        }

        if skill_score > 0:
            matched_developers.append({
                "id": dev.id,
                "user_id": dev.user_id,
                "name": dev.user.full_name if dev.user else "Unknown",
                "profile_photo_url": dev.profile_photo_url,
                "skills": dev.skills,
                "experience_years": dev.experience_years,
                "previous_projects": dev.previous_projects or [],
                "availability": dev.availability,
                "expected_budget": dev.expected_budget,
                "match_percentage": round(final_score, 1),
                "breakdown": breakdown,
                "why_recommended": generate_reasons(dev, breakdown)
            })

    matched_developers.sort(key=lambda x: x["match_percentage"], reverse=True)

    # Return ONLY the top 5 developers
    return {
        "project_title": project.project_title,
        "required_skills": required_skills,
        "matched_developers": matched_developers[:5]
    }