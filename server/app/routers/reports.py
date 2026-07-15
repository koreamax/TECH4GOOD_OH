from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Detection, Report
from ..serializers import detection_dict, report_dict

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportCreate(BaseModel):
    detection_id: int
    title: str
    content: str
    address: str = ""


@router.post("")
def create_report(body: ReportCreate, db: Session = Depends(get_db)):
    det = db.get(Detection, body.detection_id)
    if det is None:
        raise HTTPException(404, "탐지를 찾을 수 없습니다")
    det.verified = "confirmed"

    now = datetime.now()
    report = Report(
        detection_id=body.detection_id,
        title=body.title,
        content=body.content,
        address=body.address,
        receipt_no="",
        created_at=now.isoformat(timespec="seconds"),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    # 모의 접수번호 (데모용 — 실접수 아님, docs/ARCHITECTURE.md 참고)
    report.receipt_no = f"SPP-{now.strftime('%Y%m%d')}-{report.id:04d}"
    db.commit()
    db.refresh(report)
    return report_dict(report)


@router.get("")
def list_reports(walk_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Report).order_by(Report.id.desc())
    reports = query.all()
    result = []
    for r in reports:
        det = db.get(Detection, r.detection_id)
        if walk_id is not None and (det is None or det.walk_id != walk_id):
            continue
        item = report_dict(r)
        item["detection"] = detection_dict(det) if det else None
        result.append(item)
    return result
