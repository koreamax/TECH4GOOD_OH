from datetime import datetime

from fastapi import APIRouter, File, Form, UploadFile

from ..services.gemini import generate_complaint
from ..services.geocode import reverse_geocode

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("/generate")
def generate(
    image: UploadFile = File(...),
    class_name: str = Form(...),
    confidence: float = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    detected_at: str = Form(None),
):
    address = reverse_geocode(lat, lng)
    when = detected_at or datetime.now().isoformat(timespec="minutes")
    complaint, source = generate_complaint(
        image_bytes=image.file.read(),
        class_name=class_name,
        confidence=confidence,
        address=address,
        detected_at=when,
    )
    return {**complaint, "address": address, "source": source}
