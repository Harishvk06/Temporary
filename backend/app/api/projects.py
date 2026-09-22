from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.dependencies import get_current_user, get_user_entity_or_404
from app.models.user import User
from app.models.project import Project
from app.models.image import Image
from app.models.video import Video
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.schemas.image import ImageResponse
from app.schemas.video import VideoResponse

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all projects for current user"""
    return db.query(Project).filter(Project.user_id == current_user.id).order_by(Project.updated_at.desc()).all()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new project"""
    project = Project(
        user_id=current_user.id,
        name=project_in.name,
        description=project_in.description,
        type=project_in.type,
        is_public=project_in.is_public,
        thumbnail_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get project details by ID"""
    return get_user_entity_or_404(db, Project, project_id, current_user.id, "Project")

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project metadata (name, description, thumbnail, visibility)"""
    project = get_user_entity_or_404(db, Project, project_id, current_user.id, "Project")
    if project_update.name is not None:
        project.name = project_update.name
    if project_update.description is not None:
        project.description = project_update.description
    if project_update.thumbnail_url is not None:
        project.thumbnail_url = project_update.thumbnail_url
    if project_update.is_public is not None:
        project.is_public = project_update.is_public

    db.commit()
    db.refresh(project)
    return project

@router.get("/{project_id}/assets")
def get_project_assets(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all image and video media assets associated with a project"""
    project = get_user_entity_or_404(db, Project, project_id, current_user.id, "Project")
    images = db.query(Image).filter(Image.project_id == project_id, Image.user_id == current_user.id).all()
    videos = db.query(Video).filter(Video.project_id == project_id, Video.user_id == current_user.id).all()
    return {
        "project_id": project_id,
        "project_name": project.name,
        "images": images,
        "videos": videos,
        "total_assets": len(images) + len(videos)
    }

@router.delete("/{project_id}")
def delete_project(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a project and its associated assets"""
    project = get_user_entity_or_404(db, Project, project_id, current_user.id, "Project")
    db.delete(project)
    db.commit()
    return {"success": True, "message": "Project deleted successfully"}
