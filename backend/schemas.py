from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime, date
from typing import Literal, List, Optional, Any

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    confirm_password: str
    role: Literal["customer", "developer"]

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class PreviousProject(BaseModel):
    name: str
    description: str

class DeveloperProfileBase(BaseModel):
    bio: Optional[str] = None
    skills: List[str] = []
    experience_years: int = 0
    education: Optional[str] = None
    previous_projects: List[PreviousProject] = []
    github_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    availability: str = "Available"
    expected_budget: Optional[float] = None
    profile_photo_url: Optional[str] = None

class DeveloperProfileCreate(DeveloperProfileBase):
    pass

class DeveloperProfileOut(DeveloperProfileBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    project_title: Optional[str] = None
    raw_description: str
    input_type: str = "text"
    budget: Optional[str] = None
    deadline: Optional[date] = None
    platform: Optional[str] = None
    additional_info: Optional[str] = None

class ProjectOut(ProjectCreate):
    project_id: int
    customer_id: int
    project_status: str
    created_at: datetime
    requirements_approved: bool = False 
    class Config:
        from_attributes = True

class ProjectModule(BaseModel):
    module_name: str
    description: str

class AIAnalysisResult(BaseModel):
    project_title: str
    project_overview: str
    functional_requirements: List[str]
    non_functional_requirements: List[str]
    required_skills: List[str]
    suggested_technologies: List[str]
    complexity: str
    suggested_modules: List[ProjectModule]

class ClarificationQA(BaseModel):
    question: str
    answer: str

class ClarificationQuestions(BaseModel):
    questions: List[str]

class AnalyzeProjectRequest(BaseModel):
    project_id: int
    description: str
    clarification_qa: Optional[List[ClarificationQA]] = []

class ProjectRequestCreate(BaseModel):
    project_id: int
    developer_id: int
    proposed_budget: Optional[str] = None
    proposed_deadline: Optional[date] = None
    required_services: Optional[str] = None
    message: Optional[str] = None

class ProjectRequestOut(ProjectRequestCreate):
    request_id: int
    customer_id: int
    status: str
    created_at: datetime
    
    project_title: Optional[str] = None
    customer_name: Optional[str] = None
    ai_analysis: Optional[Any] = None 
    
    # Day 20 Agreement Fields
    final_budget: Optional[str] = None
    final_deadline: Optional[date] = None
    project_scope: Optional[str] = None
    customer_confirmed: bool = False
    developer_confirmed: bool = False

    project_status: Optional[str] = None 

    class Config:
        from_attributes = True

# --- DAY 20 SCHEMAS ---
class MessageCreate(BaseModel):
    message_text: str

class MessageOut(BaseModel):
    message_id: int
    request_id: int
    sender_id: int
    sender_name: str
    message_text: str
    created_at: datetime

    class Config:
        from_attributes = True

class AgreementUpdate(BaseModel):
    final_budget: str
    final_deadline: date
    project_scope: str

# ... (keep existing schemas) ...

class ProjectStatusUpdate(BaseModel):
    status: str # "Project Started", "In Progress", "Testing", "Completed", "Delivered"

class MilestoneCreate(BaseModel):
    title: str
    status: str = "Pending"

class MilestoneOut(MilestoneCreate):
    milestone_id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ... (keep existing schemas) ...

class ProjectDeliveryOut(BaseModel):
    delivery_id: int
    project_id: int
    delivery_description: str
    zip_file_path: Optional[str] = None
    doc_file_path: Optional[str] = None
    github_link: Optional[str] = None
    submitted_at: datetime

    class Config:
        from_attributes = True

class ProjectHistoryOut(BaseModel):
    project_title: str
    original_description: str
    ai_analysis: Optional[Any] = None
    milestones: List[Any] = []
    final_budget: Optional[str] = None
    final_deadline: Optional[date] = None
    project_scope: Optional[str] = None
    delivery: Optional[ProjectDeliveryOut] = None
    project_status: str