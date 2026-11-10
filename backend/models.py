from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float, Text, Date, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)   
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    projects = relationship("Project", back_populates="customer")
    developer_profile = relationship("DeveloperProfile", back_populates="user", uselist=False)

class Project(Base):
    __tablename__ = "projects"

    project_id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    project_title = Column(String(150), nullable=True)
    raw_description = Column(Text, nullable=False)
    input_type = Column(String(20), default="text")
    budget = Column(String(100), nullable=True)
    deadline = Column(Date, nullable=True)
    platform = Column(String(50), nullable=True)
    additional_info = Column(Text, nullable=True)
    project_status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ai_analysis = Column(JSON, nullable=True)
    requirements_approved = Column(Boolean, default=False) 
    
    # NEW: Required for Razorpay
    razorpay_order_id = Column(String(255), nullable=True)

    customer = relationship("User", back_populates="projects")

class DeveloperProfile(Base):
    __tablename__ = "developer_profiles"
    # ... (keep exactly as is) ...
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    bio = Column(String(500), nullable=True)
    skills = Column(JSON, default=list) 
    previous_projects = Column(JSON, default=list) 
    experience_years = Column(Integer, default=0)
    education = Column(String(255), nullable=True)
    github_link = Column(String(255), nullable=True)
    linkedin_link = Column(String(255), nullable=True)
    availability = Column(String(50), default="Available")
    expected_budget = Column(Float, nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    user = relationship("User", back_populates="developer_profile")

class ProjectRequest(Base):
    __tablename__ = "project_requests"
    # ... (keep exactly as is) ...
    request_id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.project_id"))
    customer_id = Column(Integer, ForeignKey("users.id"))
    developer_id = Column(Integer, ForeignKey("users.id"))
    proposed_budget = Column(String(100), nullable=True)
    proposed_deadline = Column(Date, nullable=True)
    required_services = Column(Text, nullable=True)
    message = Column(Text, nullable=True)
    status = Column(String(50), default="Pending")
    final_budget = Column(String(100), nullable=True)
    final_deadline = Column(Date, nullable=True)
    project_scope = Column(Text, nullable=True)
    customer_confirmed = Column(Boolean, default=False)
    developer_confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    project = relationship("Project")
    customer = relationship("User", foreign_keys=[customer_id])
    developer = relationship("User", foreign_keys=[developer_id])

class Message(Base):
    __tablename__ = "messages"
    # ... (keep exactly as is) ...
    message_id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("project_requests.request_id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    message_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sender = relationship("User")

class ProjectMilestone(Base):
    __tablename__ = "project_milestones"
    # ... (keep exactly as is) ...
    milestone_id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.project_id"))
    title = Column(String(200), nullable=False)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    project = relationship("Project")

class ProjectDelivery(Base):
    __tablename__ = "project_deliveries"
    # ... (keep exactly as is) ...
    delivery_id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.project_id"), unique=True)
    developer_id = Column(Integer, ForeignKey("users.id"))
    delivery_description = Column(Text, nullable=False)
    zip_file_path = Column(String(500), nullable=True)
    doc_file_path = Column(String(500), nullable=True)
    github_link = Column(String(255), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    project = relationship("Project")
    developer = relationship("User")

class Payment(Base):
    __tablename__ = "payments"
    # ... (keep exactly as is, plus gateway id) ...
    payment_id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.project_id"))
    customer_id = Column(Integer, ForeignKey("users.id"))
    developer_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(String(100), nullable=False)
    status = Column(String(50), default="Completed")
    
    # NEW: To track Razorpay Payment ID
    gateway_payment_id = Column(String(255), nullable=True) 
    
    payment_date = Column(DateTime(timezone=True), server_default=func.now())
    project = relationship("Project")