"""
M7 - Python Image Processing Service

POST /process-image
  - Accepts a multipart image upload
  - Resizes it (and creates a thumbnail) with Pillow
  - Uploads both to Cloudflare R2 via boto3 (S3-compatible API)
  - Returns URLs + metadata

Standard error shape on failure: { "error": "code", "message": "..." }
"""

import io
import os
import uuid
from typing import Optional

import boto3
from botocore.config import Config
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

load_dotenv()

app = FastAPI(title="Image Processing Service")

# ---- Required config from environment (fails fast if missing) ----
R2_BUCKET = os.environ["R2_BUCKET"]
R2_ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
R2_ACCESS_KEY_ID = os.environ["R2_ACCESS_KEY_ID"]
R2_SECRET_ACCESS_KEY = os.environ["R2_SECRET_ACCESS_KEY"]
R2_PUBLIC_URL = os.environ["R2_PUBLIC_URL"].rstrip("/")

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB hard cap
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
DEFAULT_MAX_WIDTH = 2000
DEFAULT_MAX_HEIGHT = 2000
THUMB_MAX_SIZE = (400, 400)
DEFAULT_QUALITY = 85

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    """Standard project-wide error shape."""
    return JSONResponse(status_code=status_code, content={"error": code, "message": message})


def encode_jpeg(img: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/process-image")
async def process_image(
    file: UploadFile = File(...),
    max_width: Optional[int] = Form(None),
    max_height: Optional[int] = Form(None),
    quality: Optional[int] = Form(None),
):
    # ---- Validate content type ----
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        return error_response(
            400, "invalid_file_type", f"Unsupported content type: {file.content_type}"
        )

    raw_bytes = await file.read()

    # ---- Validate size ----
    if len(raw_bytes) > MAX_FILE_SIZE_BYTES:
        return error_response(
            413, "file_too_large", f"File exceeds {MAX_FILE_SIZE_BYTES} byte limit"
        )

    # ---- Validate it's actually a decodable image ----
    try:
        image = Image.open(io.BytesIO(raw_bytes))
        image.load()
    except UnidentifiedImageError:
        return error_response(400, "invalid_file", "File is not a valid image")
    except Exception:
        return error_response(400, "invalid_file", "Could not read image file")

    try:
        # Normalize mode so JPEG saving never fails (handles PNG transparency etc.)
        if image.mode in ("RGBA", "P", "LA"):
            image = image.convert("RGB")

        target_w = max_width or DEFAULT_MAX_WIDTH
        target_h = max_height or DEFAULT_MAX_HEIGHT
        jpeg_quality = quality or DEFAULT_QUALITY

        resized = image.copy()
        resized.thumbnail((target_w, target_h))

        thumb = image.copy()
        thumb.thumbnail(THUMB_MAX_SIZE)

        width, height = resized.size

        original_bytes = encode_jpeg(resized, jpeg_quality)
        thumb_bytes = encode_jpeg(thumb, jpeg_quality)

        asset_id = str(uuid.uuid4())
        original_key = f"originals/{asset_id}.jpg"
        thumb_key = f"thumbs/{asset_id}.jpg"

        s3.put_object(
            Bucket=R2_BUCKET, Key=original_key, Body=original_bytes, ContentType="image/jpeg"
        )
        s3.put_object(
            Bucket=R2_BUCKET, Key=thumb_key, Body=thumb_bytes, ContentType="image/jpeg"
        )

        return {
            "originalUrl": f"{R2_PUBLIC_URL}/{original_key}",
            "thumbUrl": f"{R2_PUBLIC_URL}/{thumb_key}",
            "width": width,
            "height": height,
            "sizeBytes": len(original_bytes),
        }

    except Exception as exc:
        return error_response(500, "internal_error", f"Failed to process image: {exc}")
