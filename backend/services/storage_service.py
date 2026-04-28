import os
import uuid
import requests
import tempfile
import cloudinary
import cloudinary.uploader
from flask import current_app

# ── Cloudinary Configuration ───────────────────
# Expecting CLOUDINARY_URL in environment for zero-config
# Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
if os.getenv("CLOUDINARY_URL"):
    cloudinary.config(secure=True)
else:
    # Manual fallback if specific keys are provided
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )

class StorageService:
    @staticmethod
    def upload_file(file_bytes: bytes, filename: str) -> str:
        """
        Uploads file bytes to Cloudinary with a unique name.
        Returns the secure HTTPS URL.
        """
        if len(file_bytes) > 10 * 1024 * 1024:
            raise ValueError("File is too large (max 10MB).")

        # Generate unique filename for Cloudinary to avoid overwrites
        ext = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        # Upload directly to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file_bytes,
            public_id=os.path.splitext(unique_filename)[0],
            resource_type="auto"
        )
        
        return upload_result.get("secure_url")

    @staticmethod
    def download_to_temp(url: str) -> str:
        """
        Downloads a file from a URL to a temporary local path.
        Required for OCR (Tesseract) which needs local file access.
        """
        try:
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            # Create a temporary file
            suffix = os.path.splitext(url)[1].split('?')[0] # get ext without query params
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            temp_file.write(response.content)
            temp_file.close()
            
            return temp_file.name
        except Exception as e:
            raise Exception(f"Failed to fetch file from storage: {str(e)}")

    @staticmethod
    def cleanup(local_path: str):
        """Removes the temporary local file."""
        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception:
                pass
