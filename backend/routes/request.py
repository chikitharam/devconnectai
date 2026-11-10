from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
import models
import schemas
from database import get_db
from auth import require_role

router = APIRouter(tags=["Requests"])

@router.post("/requests", response_model=schemas.ProjectRequestOut)
def send_request(
    request_data: schemas.ProjectRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    project = db.query(models.Project).filter(
        models.Project.project_id == request_data.project_id,
        models.Project.customer_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_request = models.ProjectRequest(
        project_id=request_data.project_id,
        customer_id=current_user.id,
        developer_id=request_data.developer_id,
        proposed_budget=request_data.proposed_budget,
        proposed_deadline=request_data.proposed_deadline,
        required_services=request_data.required_services,
        message=request_data.message,
        status="Pending"
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

@router.get("/customer/requests", response_model=List[schemas.ProjectRequestOut])
def get_customer_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    requests = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.customer_id == current_user.id
    ).all()
    
    result = []
    for req in requests:
        req_dict = schemas.ProjectRequestOut.from_orm(req).model_dump()
        req_dict["project_title"] = req.project.project_title
        req_dict["customer_name"] = current_user.full_name
        result.append(req_dict)
        
    return result

@router.get("/developer/requests", response_model=List[schemas.ProjectRequestOut])
def get_developer_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    requests = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.developer_id == current_user.id
    ).all()
    
    result = []
    for req in requests:
        req_dict = schemas.ProjectRequestOut.from_orm(req).model_dump()
        req_dict["project_title"] = req.project.project_title
        req_dict["customer_name"] = req.customer.full_name if req.customer else "Unknown"
        req_dict["ai_analysis"] = req.project.ai_analysis
        result.append(req_dict)
        
    return result

@router.put("/requests/{request_id}/accept")
def accept_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.request_id == request_id,
        models.ProjectRequest.developer_id == current_user.id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = "Accepted"
    project = db.query(models.Project).filter(models.Project.project_id == req.project_id).first()
    if project:
        project.project_status = "agreement"
        
    db.commit()
    return {"message": "Request accepted successfully"}

@router.put("/requests/{request_id}/reject")
def reject_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.request_id == request_id,
        models.ProjectRequest.developer_id == current_user.id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = "Rejected"
    db.commit()
    return {"message": "Request rejected successfully"}

@router.put("/requests/{request_id}/negotiate")
def negotiate_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.request_id == request_id,
        models.ProjectRequest.developer_id == current_user.id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.status = "Negotiating"
    db.commit()
    return {"message": "Request marked for negotiation"}

# --- DAY 20 ENDPOINTS ---

@router.get("/requests/{request_id}/messages", response_model=List[schemas.MessageOut])
def get_messages(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer", "developer"))
):
    req = db.query(models.ProjectRequest).filter(models.ProjectRequest.request_id == request_id).first()
    if not req or (req.customer_id != current_user.id and req.developer_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    messages = db.query(models.Message).filter(models.Message.request_id == request_id).order_by(models.Message.created_at.asc()).all()
    
    result = []
    for msg in messages:
        result.append({
            "message_id": msg.message_id,
            "request_id": msg.request_id,
            "sender_id": msg.sender_id,
            "sender_name": msg.sender.full_name if msg.sender else "Unknown",
            "message_text": msg.message_text,
            "created_at": msg.created_at
        })
    return result

@router.post("/requests/{request_id}/messages", response_model=schemas.MessageOut)
def send_message(
    request_id: int,
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer", "developer"))
):
    req = db.query(models.ProjectRequest).filter(models.ProjectRequest.request_id == request_id).first()
    if not req or (req.customer_id != current_user.id and req.developer_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    new_msg = models.Message(
        request_id=request_id,
        sender_id=current_user.id,
        message_text=payload.message_text
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    if req.status == "Pending" or req.status == "Accepted":
        req.status = "Negotiating"
        db.commit()

    # Return the dictionary directly to avoid Pydantic validation errors
    return {
        "message_id": new_msg.message_id,
        "request_id": new_msg.request_id,
        "sender_id": new_msg.sender_id,
        "sender_name": current_user.full_name,
        "message_text": new_msg.message_text,
        "created_at": new_msg.created_at
    }

@router.put("/requests/{request_id}/agreement")
def update_agreement(
    request_id: int,
    payload: schemas.AgreementUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.request_id == request_id,
        models.ProjectRequest.developer_id == current_user.id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.final_budget = payload.final_budget
    req.final_deadline = payload.final_deadline
    req.project_scope = payload.project_scope
    
    req.customer_confirmed = False
    req.developer_confirmed = False
    
    db.commit()
    return {"message": "Agreement updated successfully"}

@router.put("/requests/{request_id}/confirm")
def confirm_agreement(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer", "developer"))
):
    req = db.query(models.ProjectRequest).filter(models.ProjectRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if current_user.role == "customer" and req.customer_id == current_user.id:
        req.customer_confirmed = True
    elif current_user.role == "developer" and req.developer_id == current_user.id:
        req.developer_confirmed = True
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    if req.customer_confirmed and req.developer_confirmed:
        req.status = "Active"
        project = db.query(models.Project).filter(models.Project.project_id == req.project_id).first()
        if project:
            project.project_status = "active"

    db.commit()
    return {"message": "Confirmation saved", "status": req.status}

@router.get("/developer/requests", response_model=List[schemas.ProjectRequestOut])
def get_developer_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    requests = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.developer_id == current_user.id
    ).all()
    
    result = []
    for req in requests:
        req_dict = schemas.ProjectRequestOut.from_orm(req).model_dump()
        req_dict["project_title"] = req.project.project_title
        req_dict["customer_name"] = req.customer.full_name if req.customer else "Unknown"
        req_dict["ai_analysis"] = req.project.ai_analysis
        
        # ADD THIS LINE:
        req_dict["project_status"] = req.project.project_status 
        
        result.append(req_dict)
        
    return result