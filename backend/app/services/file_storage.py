import os
import uuid
import aiofiles
from fastapi import UploadFile
from app.config import settings

class FileStorageService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(os.path.join(self.upload_dir, "images"), exist_ok=True)
        os.makedirs(os.path.join(self.upload_dir, "videos"), exist_ok=True)

    async def save_file(self, file: UploadFile, subfolder: str = "images") -> tuple[str, str, int]:
        """Saves an uploaded file locally and returns (filename, filepath, size)"""
        ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        target_dir = os.path.join(self.upload_dir, subfolder)
        os.makedirs(target_dir, exist_ok=True)
        filepath = os.path.join(target_dir, unique_filename)

        size = 0
        async with aiofiles.open(filepath, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # read in 1MB chunks
                size += len(content)
                await out_file.write(content)

        relative_path = f"/uploads/{subfolder}/{unique_filename}"
        return unique_filename, relative_path, size

file_storage = FileStorageService()
