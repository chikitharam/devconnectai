from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Request
from sqlalchemy.orm import Session
import os
import shutil
import uuid
import json
import models
import schemas
import razorpay
from database import get_db
from auth import require_role
from typing import List

router = APIRouter(prefix="/projects", tags=["Projects"])

# Initialize the Razorpay client
razorpay_client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))

@router.post("", response_model=schemas.ProjectOut)
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    new_project = models.Project(
        customer_id=current_user.id,
        project_title=project.project_title,
        raw_description=project.raw_description,
        input_type=project.input_type,
        budget=project.budget,
        deadline=project.deadline,
        platform=project.platform,
        additional_info=project.additional_info,
        project_status="pending"
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.post("/upload-audio")
def upload_audio(
    file: UploadFile = File(...),
    current_user: models.User = Depends(require_role("customer"))
):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")

    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = f"uploads/{unique_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"message": "Audio uploaded successfully", "file_path": f"/{file_path}"}

@router.get("/{project_id}/analysis")
def get_project_analysis(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    project = db.query(models.Project).filter(
        models.Project.project_id == project_id,
        models.Project.customer_id == current_user.id
    ).first()
    
    if not project or not project.ai_analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    return {
        "project_id": project.project_id,
        "ai_analysis": project.ai_analysis,
        "project_status": project.project_status,
        "raw_description": project.raw_description
    }

@router.put("/{project_id}/analysis")
def update_project_analysis(
    project_id: int,
    analysis_data: schemas.AIAnalysisResult,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    project = db.query(models.Project).filter(
        models.Project.project_id == project_id,
        models.Project.customer_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.ai_analysis = analysis_data.model_dump()
    project.project_status = "requirements_approved" 
    db.commit()
    
    return {"message": "Analysis updated successfully"}

@router.put("/{project_id}/requirements")
def approve_project_requirements(
    project_id: int,
    analysis_data: schemas.AIAnalysisResult,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer"))
):
    project = db.query(models.Project).filter(
        models.Project.project_id == project_id,
        models.Project.customer_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project.ai_analysis = analysis_data.model_dump()
    project.requirements_approved = True
    project.project_status = "requirements_approved"
    
    db.commit()
    return {"message": "Requirements approved successfully", "requirements_approved": True}

@router.delete("/{project_id}")
def delete_project(
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
        
    db.query(models.ProjectRequest).filter(models.ProjectRequest.project_id == project_id).delete()
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

@router.get("/{project_id}/status")
def get_project_status(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer", "developer"))
):
    project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.project_id == project_id,
        models.ProjectRequest.status.in_(["Active", "Accepted", "Completed", "Delivered"])
    ).first()
    
    if not req:
        raise HTTPException(status_code=400, detail="No active agreement found for this project")

    if current_user.id != project.customer_id and current_user.id != req.developer_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this project")

    milestones = db.query(models.ProjectMilestone).filter(
        models.ProjectMilestone.project_id == project_id
    ).order_by(models.ProjectMilestone.created_at.asc()).all()

    return {
        "project_title": project.project_title,
        "project_status": project.project_status,
        "milestones": [
            {
                "milestone_id": m.milestone_id,
                "title": m.title,
                "status": m.status,
                "created_at": m.created_at
            } for m in milestones
        ],
        "role": current_user.role
    }

@router.put("/{project_id}/status")
def update_project_status(
    project_id: int,
    payload: schemas.ProjectStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.project_id == project_id,
        models.ProjectRequest.developer_id == current_user.id,
        models.ProjectRequest.status.in_(["Active", "Accepted", "Completed", "Delivered"])
    ).first()

    if not req:
        raise HTTPException(status_code=403, detail="You are not the assigned developer for this project")

    project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.project_status = payload.status
    db.commit()
    return {"message": "Project status updated successfully"}

@router.post("/{project_id}/milestones", response_model=schemas.MilestoneOut)
def create_milestone(
    project_id: int,
    payload: schemas.MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.project_id == project_id,
        models.ProjectRequest.developer_id == current_user.id,
        models.ProjectRequest.status.in_(["Active", "Accepted", "Completed", "Delivered"])
    ).first()

    if not req:
        raise HTTPException(status_code=403, detail="You are not the assigned developer for this project")

    new_milestone = models.ProjectMilestone(
        project_id=project_id,
        title=payload.title,
        status=payload.status
    )
    db.add(new_milestone)
    db.commit()
    db.refresh(new_milestone)
    return new_milestone

@router.post("/{project_id}/deliver", response_model=schemas.ProjectDeliveryOut)
async def deliver_project(
    project_id: int,
    delivery_description: str = Form(...),
    github_link: str = Form(None),
    zip_file: UploadFile = File(...),
    doc_file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("developer"))
):
    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.project_id == project_id,
        models.ProjectRequest.developer_id == current_user.id,
        models.ProjectRequest.status.in_(["Active", "Accepted"])
    ).first()

    if not req:
        raise HTTPException(status_code=403, detail="You are not the assigned developer for this project")

    if not zip_file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Software must be a .zip file")
    
    if doc_file and not (doc_file.filename.endswith(".pdf") or doc_file.filename.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Documentation must be .pdf or .docx")

    zip_content = await zip_file.read()
    if len(zip_content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="ZIP file is too large (max 50MB)")
    await zip_file.seek(0)

    safe_zip_name = f"{uuid.uuid4()}_{zip_file.filename}"
    zip_path = f"uploads/deliveries/{safe_zip_name}"
    
    safe_doc_name = None
    doc_path = None
    if doc_file:
        safe_doc_name = f"{uuid.uuid4()}_{doc_file.filename}"
        doc_path = f"uploads/deliveries/{safe_doc_name}"

    with open(zip_path, "wb") as buffer:
        shutil.copyfileobj(zip_file.file, buffer)
    
    if doc_file:
        with open(doc_path, "wb") as buffer:
            shutil.copyfileobj(doc_file.file, buffer)

    existing = db.query(models.ProjectDelivery).filter(models.ProjectDelivery.project_id == project_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    delivery = models.ProjectDelivery(
        project_id=project_id,
        developer_id=current_user.id,
        delivery_description=delivery_description,
        zip_file_path=f"/{zip_path}",
        doc_file_path=f"/{doc_path}" if doc_path else None,
        github_link=github_link
    )
    db.add(delivery)
    
    project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    project.project_status = "Delivered"
    
    db.commit()
    db.refresh(delivery)
    return delivery

@router.put("/{project_id}/complete")
def complete_project(
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
        
    if project.project_status.strip().lower() != "delivered":
        raise HTTPException(status_code=400, detail="Project has not been delivered yet")

    project.project_status = "Completed"
    db.commit()
    return {"message": "Project marked as completed"}

@router.get("/{project_id}/history")
def get_project_history(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("customer", "developer"))
):
    project = db.query(models.Project).filter(models.Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.project_id == project_id,
        models.ProjectRequest.status.in_(["Active", "Completed", "Delivered", "Paid"])
    ).first()

    if not req or (current_user.id != project.customer_id and current_user.id != req.developer_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    milestones = db.query(models.ProjectMilestone).filter(models.ProjectMilestone.project_id == project_id).all()
    delivery = db.query(models.ProjectDelivery).filter(models.ProjectDelivery.project_id == project_id).first()

    return {
        "project_title": project.project_title,
        "original_description": project.raw_description,
        "ai_analysis": project.ai_analysis,
        "milestones": [{"title": m.title, "status": m.status} for m in milestones],
        "final_budget": req.final_budget or req.proposed_budget,
        "final_deadline": req.final_deadline or req.proposed_deadline,
        "project_scope": req.project_scope or req.required_services,
        "delivery": delivery,
        "project_status": project.project_status
    }

# --- REAL RAZORPAY PAYMENT ENDPOINT ---

@router.post("/{project_id}/pay")
def create_payment_order(
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
        
    # FIX: Case-insensitive check
    current_status = project.project_status.strip().lower() if project.project_status else "unknown"
    
    if current_status not in ["delivered", "completed"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Project must be delivered before payment. Current DB status: '{project.project_status}'"
        )

    req = db.query(models.ProjectRequest).filter(
        models.ProjectRequest.project_id == project_id,
        models.ProjectRequest.status.in_(["Active", "Accepted", "Completed", "Delivered"])
    ).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Agreement not found for this project")

    agreed_amount = req.final_budget or req.proposed_budget or "0"
    
    try:
        # Remove any currency symbols or commas before converting to float
        clean_amount = "".join(filter(lambda x: x.isdigit() or x == '.', str(agreed_amount)))
        amount_in_paise = int(float(clean_amount) * 100)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid budget format: '{agreed_amount}'")

    if amount_in_paise < 100:
         raise HTTPException(status_code=400, detail="Amount must be at least 1 INR")

    try:
        razorpay_order = razorpay_client.order.create(dict(
            amount=amount_in_paise,
            currency="INR",
            receipt=f"receipt_project_{project_id}",
            payment_capture=1
        ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Razorpay Error: {str(e)}")

    # Save the order ID to our database for webhook verification
    project.razorpay_order_id = razorpay_order['id']
    db.commit()

    return {"order_id": razorpay_order['id'], "amount": amount_in_paise, "currency": "INR"}

@router.post("/payments/webhooks/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    webhook_body = await request.body()
    received_signature = request.headers.get("X-Razorpay-Signature")
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")

    if not received_signature or not webhook_secret:
        raise HTTPException(status_code=400, detail="Missing signature or secret")

    try:
        razorpay_client.utility.verify_webhook_signature(
            webhook_body.decode('utf-8'), 
            received_signature, 
            webhook_secret
        )
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = json.loads(webhook_body)
    event = payload.get("event")

    if event == "order.paid":
        order_id = payload["payload"]["order"]["entity"]["id"]
        payment_id = payload["payload"]["payment"]["entity"]["id"]
        amount_paid = payload["payload"]["payment"]["entity"]["amount"] / 100
        
        project = db.query(models.Project).filter(models.Project.razorpay_order_id == order_id).first()
        
        if project and project.project_status != "Paid":
            project.project_status = "Paid"
            
            req = db.query(models.ProjectRequest).filter(
                models.ProjectRequest.project_id == project.project_id,
                models.ProjectRequest.status.in_(["Active", "Accepted", "Completed", "Delivered"])
            ).first()

            if req:
                new_payment = models.Payment(
                    project_id=project.project_id,
                    customer_id=project.customer_id,
                    developer_id=req.developer_id,
                    amount=str(amount_paid),
                    status="Completed",
                    gateway_payment_id=payment_id
                )
                db.add(new_payment)
                db.commit()
                
    elif event == "payment.failed":
        print(f"Payment failed for order {payload['payload']['order']['entity']['id']}")

    return {"status": "ok"}