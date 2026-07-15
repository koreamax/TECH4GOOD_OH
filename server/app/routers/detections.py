from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Detection
from ..serializers import detection_dict
from ..services.scoring import CLUSTER_RADIUS_M, build_clusters, haversine_m
from ..services.storage import save_upload

router = APIRouter(prefix="/detections", tags=["detections"])

VALID_VERIFIED = {"pending", "confirmed", "rejected"}


class VerifyBody(BaseModel):
    verified: str


def _cluster_score_at(db: Session, det: Detection) -> int:
    markers = build_clusters(db.query(Detection).all())
    for m in markers:
        if m["class_name"] == det.class_name and haversine_m(m["lat"], m["lng"], det.lat, det.lng) <= CLUSTER_RADIUS_M:
            return m["score"]
    return 0


@router.post("")
def create_detection(
    image: UploadFile = File(...),
    class_name: str = Form(...),
    confidence: float = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    walk_id: int | None = Form(None),
    verified: str = Form("pending"),
    db: Session = Depends(get_db),
):
    if verified not in VALID_VERIFIED:
        raise HTTPException(400, f"verified 는 {VALID_VERIFIED} 중 하나여야 합니다")
    det = Detection(
        walk_id=walk_id,
        class_name=class_name,
        confidence=confidence,
        lat=lat,
        lng=lng,
        verified=verified,
        created_at=datetime.now().isoformat(timespec="seconds"),
    )
    db.add(det)
    db.commit()
    db.refresh(det)
    det.image_path = save_upload(image, "detections", f"{det.id}.jpg")
    db.commit()
    return {"id": det.id, "image_url": det.image_path, "cluster_score": _cluster_score_at(db, det)}


@router.patch("/{detection_id}")
def verify_detection(detection_id: int, body: VerifyBody, db: Session = Depends(get_db)):
    if body.verified not in VALID_VERIFIED:
        raise HTTPException(400, f"verified 는 {VALID_VERIFIED} 중 하나여야 합니다")
    det = db.get(Detection, detection_id)
    if det is None:
        raise HTTPException(404, "탐지를 찾을 수 없습니다")
    det.verified = body.verified
    db.commit()
    db.refresh(det)
    return detection_dict(det)
