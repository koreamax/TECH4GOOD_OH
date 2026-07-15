import json

from .models import Detection, Report, Walk


def walk_dict(walk: Walk, detection_count: int = 0, report_count: int = 0) -> dict:
    return {
        "id": walk.id,
        "started_at": walk.started_at,
        "ended_at": walk.ended_at,
        "distance_m": walk.distance_m,
        "duration_s": walk.duration_s,
        "route": json.loads(walk.route_json or "[]"),
        "dog_photo_url": walk.dog_photo_path,
        "user_name": walk.user_name,
        "detection_count": detection_count,
        "report_count": report_count,
    }


def detection_dict(det: Detection) -> dict:
    return {
        "id": det.id,
        "walk_id": det.walk_id,
        "class_name": det.class_name,
        "confidence": det.confidence,
        "lat": det.lat,
        "lng": det.lng,
        "image_url": det.image_path,
        "verified": det.verified,
        "created_at": det.created_at,
    }


def report_dict(report: Report) -> dict:
    return {
        "id": report.id,
        "detection_id": report.detection_id,
        "title": report.title,
        "content": report.content,
        "address": report.address,
        "receipt_no": report.receipt_no,
        "status": report.status,
        "created_at": report.created_at,
    }
