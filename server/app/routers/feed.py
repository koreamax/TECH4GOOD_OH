"""커뮤니티 피드. 현재 앱 IA(피그마 시안)에는 피드 화면이 없어 서버만 유지한다 — 확장 대비."""
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Detection, Report, Walk

router = APIRouter(prefix="/feed", tags=["feed"])


def _downsample(points: list, max_points: int = 20) -> list:
    if len(points) <= max_points:
        return points
    step = len(points) / max_points
    return [points[int(i * step)] for i in range(max_points)]


@router.get("")
def feed(limit: int = 20, db: Session = Depends(get_db)):
    walks = db.query(Walk).order_by(Walk.id.desc()).limit(limit).all()
    cards = []
    for w in walks:
        det_ids = [d.id for d in db.query(Detection).filter(Detection.walk_id == w.id).all()]
        report_count = (
            db.query(Report).filter(Report.detection_id.in_(det_ids)).count() if det_ids else 0
        )
        route = json.loads(w.route_json or "[]")
        cards.append(
            {
                "walk_id": w.id,
                "user_name": w.user_name,
                "date": (w.started_at or "")[:10],
                "distance_m": w.distance_m,
                "duration_s": w.duration_s,
                "dog_photo_url": w.dog_photo_path,
                "route_preview": _downsample([{"lat": p.get("lat"), "lng": p.get("lng")} for p in route]),
                "report_count": report_count,
                "badge": f"파손 발견 {report_count}건" if report_count else "순찰 완료",
            }
        )
    return cards
