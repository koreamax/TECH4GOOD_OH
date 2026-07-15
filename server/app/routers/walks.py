from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Detection, Report, Walk
from ..serializers import detection_dict, report_dict, walk_dict
from ..services.storage import save_upload

router = APIRouter(prefix="/walks", tags=["walks"])


def _counts(db: Session, walk_id: int) -> tuple[int, int]:
    det_ids = [d.id for d in db.query(Detection).filter(Detection.walk_id == walk_id).all()]
    report_count = (
        db.query(Report).filter(Report.detection_id.in_(det_ids)).count() if det_ids else 0
    )
    return len(det_ids), report_count


@router.post("")
def create_walk(
    route_json: str = Form(...),
    started_at: str = Form(...),
    ended_at: str = Form(...),
    distance_m: float = Form(...),
    duration_s: int = Form(...),
    detection_ids: str = Form(""),
    user_name: str = Form("익명의 순찰대원"),
    dog_photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    walk = Walk(
        route_json=route_json,
        started_at=started_at,
        ended_at=ended_at,
        distance_m=distance_m,
        duration_s=duration_s,
        user_name=user_name,
    )
    db.add(walk)
    db.commit()
    db.refresh(walk)

    if dog_photo is not None and dog_photo.filename:
        walk.dog_photo_path = save_upload(dog_photo, "walks", f"{walk.id}_dog.jpg")

    # 산책 중 저장된 탐지들을 이 산책에 연결
    for raw in detection_ids.split(","):
        raw = raw.strip()
        if not raw:
            continue
        det = db.get(Detection, int(raw))
        if det is not None:
            det.walk_id = walk.id
    db.commit()
    db.refresh(walk)

    det_count, report_count = _counts(db, walk.id)
    return walk_dict(walk, det_count, report_count)


@router.get("")
def list_walks(limit: int = 20, db: Session = Depends(get_db)):
    walks = db.query(Walk).order_by(Walk.id.desc()).limit(limit).all()
    return [walk_dict(w, *_counts(db, w.id)) for w in walks]


@router.get("/{walk_id}")
def get_walk(walk_id: int, db: Session = Depends(get_db)):
    walk = db.get(Walk, walk_id)
    if walk is None:
        raise HTTPException(404, "산책 기록을 찾을 수 없습니다")
    detections = db.query(Detection).filter(Detection.walk_id == walk_id).all()
    det_ids = [d.id for d in detections]
    reports = (
        db.query(Report).filter(Report.detection_id.in_(det_ids)).all() if det_ids else []
    )
    result = walk_dict(walk, len(detections), len(reports))
    result["detections"] = [detection_dict(d) for d in detections]
    result["reports"] = [report_dict(r) for r in reports]
    return result
