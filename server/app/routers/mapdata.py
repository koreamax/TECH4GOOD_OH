from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Detection
from ..services.scoring import build_clusters, haversine_m

router = APIRouter(prefix="/map", tags=["map"])


@router.get("/markers")
def markers(
    lat: float | None = None,
    lng: float | None = None,
    radius_m: float = 3000,
    db: Session = Depends(get_db),
):
    result = build_clusters(db.query(Detection).all())
    if lat is not None and lng is not None:
        result = [m for m in result if haversine_m(lat, lng, m["lat"], m["lng"]) <= radius_m]
    return result
