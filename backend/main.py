from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles # <-- Add this import
import os

from database import engine
import models
from routes import auth, customer, developer, project, ai, matching, request

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DevConnect-AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
os.makedirs("uploads/deliveries", exist_ok=True)
# Mount the uploads folder to serve files statically
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(customer.router)
app.include_router(developer.router)
app.include_router(project.router)
app.include_router(ai.router)
app.include_router(matching.router)
app.include_router(request.router)

@app.get("/")
def root():
    return {"message": "DevConnect-AI API is running"}