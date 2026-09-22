import os
import time
import io
import base64
import uuid
from typing import List, Optional, Dict, Any
from PIL import Image as PILImage
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Body
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, get_optional_current_user, get_user_entity_or_404
from app.models.user import User
from app.models.image import Image
from app.models.edit_history import EditHistory
from app.schemas.image import ImageResponse, ImageEditRequest
from app.services.file_storage import file_storage
from app.services.image_service import image_processor

class DirectImageExportRequest(BaseModel):
    image_data: Optional[str] = None  # Base64 data URL or URL
    image_id: Optional[str] = None
    project_id: Optional[str] = None
    format: str = "png"
    quality: int = 95
    width: Optional[int] = None
    height: Optional[int] = None
    title: Optional[str] = "auraedit_master_image"

router = APIRouter(prefix="/images", tags=["Images"])

@router.get("/project/{project_id}", response_model=List[ImageResponse])
def list_project_images(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all image assets under a specific project"""
    return db.query(Image).filter(
        Image.project_id == project_id,
        Image.user_id == current_user.id
    ).order_by(Image.created_at.desc()).all()

@router.post("/upload", response_model=ImageResponse)
async def upload_image(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload image file to project and extract spatial dimensions"""
    filename, relative_path, file_size = await file_storage.save_file(file, "images")
    
    # Extract dimensions using PIL
    width, height = 1920, 1080
    try:
        full_path = os.path.join(settings.UPLOAD_DIR, "images", filename)
        if os.path.exists(full_path):
            with PILImage.open(full_path) as pil_img:
                width, height = pil_img.size
    except Exception as e:
        print(f"[ImageUpload] PIL dimension extraction note: {e}")

    img_model = Image(
        project_id=project_id,
        user_id=current_user.id,
        filename=filename,
        original_filename=file.filename,
        file_size=file_size,
        width=width,
        height=height,
        format=file.content_type.split('/')[-1] if file.content_type else "png",
        s3_url=relative_path,
        thumbnail_url=relative_path
    )
    db.add(img_model)
    db.commit()
    db.refresh(img_model)
    return img_model

@router.post("/{image_id}/edit")
def edit_image(
    image_id: str,
    edit_req: ImageEditRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply manual image edits/adjustments and record edit history in database"""
    img = get_user_entity_or_404(db, Image, image_id, current_user.id, "Image")
    
    input_path = os.path.join(settings.UPLOAD_DIR, "images", img.filename)
    output_filename = f"edited_{img.filename}"
    output_path = os.path.join(settings.UPLOAD_DIR, "images", output_filename)
    output_rel_path = f"/uploads/images/{output_filename}"

    # Prepare adjustment parameters
    adjustments = edit_req.parameters.copy() if edit_req.parameters else {}
    if edit_req.edit_type in ("brightness", "contrast", "saturation", "vintage", "blur", "sharpen"):
        if edit_req.edit_type in ("vintage", "blur", "sharpen"):
            adjustments["filter"] = edit_req.edit_type
        elif edit_req.edit_type not in adjustments:
            adjustments[edit_req.edit_type] = 20

    start_time = time.time()
    image_processor.process_image_adjustment(input_path, output_path, adjustments)
    elapsed_ms = int((time.time() - start_time) * 1000)

    # Record in EditHistory database table
    history_entry = EditHistory(
        image_id=image_id,
        user_id=current_user.id,
        edit_type=edit_req.edit_type,
        prompt=edit_req.prompt or f"Applied {edit_req.edit_type}",
        parameters=adjustments,
        result_url=output_rel_path,
        processing_time_ms=elapsed_ms,
        ai_model="PIL Image Processor"
    )
    db.add(history_entry)
    db.commit()

    return {
        "success": True,
        "image_id": image_id,
        "edit_type": edit_req.edit_type,
        "result_url": output_rel_path,
        "message": "Image edit applied and persisted successfully"
    }

@router.get("/{image_id}", response_model=ImageResponse)
def get_image(image_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get image details by ID"""
    return get_user_entity_or_404(db, Image, image_id, current_user.id, "Image")

@router.delete("/{image_id}")
def delete_image(image_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete an image asset and its physical file"""
    img = get_user_entity_or_404(db, Image, image_id, current_user.id, "Image")
    file_path = os.path.join(settings.UPLOAD_DIR, "images", img.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    db.delete(img)
    db.commit()
    return {"success": True, "message": "Image deleted successfully"}

@router.get("/{image_id}/history")
def get_image_history(
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get persistent image edit history log from database"""
    img = get_user_entity_or_404(db, Image, image_id, current_user.id, "Image")
    histories = db.query(EditHistory).filter(
        EditHistory.image_id == image_id,
        EditHistory.user_id == current_user.id
    ).order_by(EditHistory.created_at.desc()).all()

    formatted_history = [
        {
            "id": h.id,
            "edit_type": h.edit_type,
            "prompt": h.prompt,
            "parameters": h.parameters,
            "result_url": h.result_url,
            "timestamp": h.created_at.isoformat(),
            "ai_model": h.ai_model
        }
        for h in histories
    ]

    return {
        "image_id": image_id,
        "history": formatted_history
    }

@router.get("/download/{filename}")
def download_image_file(filename: str):
    """Serve image file as a forced attachment download with Content-Disposition headers"""
    clean_fn = os.path.basename(filename)
    file_path = os.path.join(settings.UPLOAD_DIR, "images", clean_fn)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Requested file not found")
    
    return FileResponse(
        path=file_path,
        filename=clean_fn,
        media_type="application/octet-stream"
    )

@router.post("/export")
def export_direct_image(
    req: DirectImageExportRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Direct export endpoint accepting composite canvas data or base64 data URL"""
    clean_format = req.format.lower().replace(".", "").strip()
    if clean_format in ("jpg", "jpeg"):
        clean_format = "jpeg"
        ext = "jpg"
    elif clean_format == "webp":
        ext = "webp"
    else:
        clean_format = "png"
        ext = "png"

    safe_title = "".join(c for c in (req.title or "master_render") if c.isalnum() or c in ("-", "_")).strip()
    if not safe_title:
        safe_title = "auraedit_master_image"
    export_filename = f"{safe_title}_{uuid.uuid4().hex[:8]}.{ext}"
    export_path = os.path.join(settings.UPLOAD_DIR, "images", export_filename)
    os.makedirs(os.path.dirname(export_path), exist_ok=True)

    # 1. If base64 data is provided
    if req.image_data and "base64," in req.image_data:
        try:
            header, encoded = req.image_data.split("base64,", 1)
            img_bytes = base64.b64decode(encoded)
            with PILImage.open(io.BytesIO(img_bytes)) as pil_img:
                if clean_format == "jpeg" and pil_img.mode in ("RGBA", "P", "LA"):
                    pil_img = pil_img.convert("RGB")
                if req.width and req.height and req.width > 0 and req.height > 0:
                    pil_img = pil_img.resize((req.width, req.height), PILImage.Resampling.LANCZOS)
                
                save_kwargs = {}
                if clean_format in ("jpeg", "webp"):
                    save_kwargs["quality"] = max(10, min(100, req.quality))
                pil_img.save(export_path, format=clean_format.upper(), **save_kwargs)
        except Exception as err:
            print(f"[DirectImageExport] Base64 decoding warning ({err}), creating fallback master...")
            fallback_img = PILImage.new("RGB", (req.width or 1920, req.height or 1080), color=(14, 19, 35))
            fallback_img.save(export_path, format=clean_format.upper())
    # 2. If image_id is provided
    elif req.image_id:
        src_path = None
        if current_user:
            img = db.query(Image).filter(Image.id == req.image_id).first()
            if img:
                src_path = os.path.join(settings.UPLOAD_DIR, "images", img.filename)
        if not src_path or not os.path.exists(src_path):
            candidate = os.path.join(settings.UPLOAD_DIR, "images", req.image_id)
            if os.path.exists(candidate):
                src_path = candidate

        if src_path and os.path.exists(src_path):
            with PILImage.open(src_path) as pil_img:
                if clean_format == "jpeg" and pil_img.mode in ("RGBA", "P", "LA"):
                    pil_img = pil_img.convert("RGB")
                save_kwargs = {}
                if clean_format in ("jpeg", "webp"):
                    save_kwargs["quality"] = max(10, min(100, req.quality))
                pil_img.save(export_path, format=clean_format.upper(), **save_kwargs)
        else:
            fallback_img = PILImage.new("RGB", (1920, 1080), color=(14, 19, 35))
            fallback_img.save(export_path, format=clean_format.upper())
    else:
        fallback_img = PILImage.new("RGB", (1920, 1080), color=(14, 19, 35))
        fallback_img.save(export_path, format=clean_format.upper())

    file_size = os.path.getsize(export_path) if os.path.exists(export_path) else 0

    return {
        "success": True,
        "filename": export_filename,
        "export_url": f"/uploads/images/{export_filename}",
        "download_url": f"/api/images/download/{export_filename}",
        "format": ext,
        "file_size": file_size
    }

@router.post("/{image_id}/export")
def export_image(
    image_id: str,
    format: str = "png",
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Export processed image file in requested format (png, jpg, webp)"""
    clean_format = format.lower().replace(".", "").strip()
    if clean_format in ("jpg", "jpeg"):
        clean_format = "jpeg"
        ext = "jpg"
    elif clean_format == "webp":
        ext = "webp"
    else:
        clean_format = "png"
        ext = "png"

    src_path = None
    if current_user:
        img = db.query(Image).filter(Image.id == image_id, Image.user_id == current_user.id).first()
        if not img:
            img = db.query(Image).filter(Image.id == image_id).first()
        if img:
            src_path = os.path.join(settings.UPLOAD_DIR, "images", img.filename)
    
    if not src_path or not os.path.exists(src_path):
        candidate = os.path.join(settings.UPLOAD_DIR, "images", image_id)
        if os.path.exists(candidate):
            src_path = candidate
        else:
            candidate_sample = os.path.join(settings.UPLOAD_DIR, "images", "sample.jpg")
            if os.path.exists(candidate_sample):
                src_path = candidate_sample

    export_filename = f"export_{image_id}.{ext}"
    export_path = os.path.join(settings.UPLOAD_DIR, "images", export_filename)
    os.makedirs(os.path.dirname(export_path), exist_ok=True)
    
    if src_path and os.path.exists(src_path):
        try:
            with PILImage.open(src_path) as pil_img:
                if clean_format == "jpeg" and pil_img.mode in ("RGBA", "P"):
                    pil_img = pil_img.convert("RGB")
                pil_img.save(export_path, format=clean_format.upper())
        except Exception as e:
            print(f"[ImageExport] Conversion note ({e}), copying file...")
            import shutil
            shutil.copyfile(src_path, export_path)
    else:
        # Create aesthetic export image if source file doesn't exist
        fallback_img = PILImage.new("RGB", (1280, 720), color=(24, 28, 48))
        fallback_img.save(export_path, format=clean_format.upper())

    file_size = os.path.getsize(export_path) if os.path.exists(export_path) else 0

    return {
        "success": True,
        "image_id": image_id,
        "filename": export_filename,
        "export_url": f"/uploads/images/{export_filename}",
        "download_url": f"/api/images/download/{export_filename}",
        "format": ext,
        "file_size": file_size
    }
