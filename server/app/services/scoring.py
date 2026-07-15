"""신뢰도 점수: 같은 지점(반경 30m·동일 클래스) 탐지를 클러스터로 묶어 점수 합산.

AI 최초 발견 +30 / 사용자 승인 +30 / 다른 산책(≈다른 시민) 재탐지 +20 / 반복 관측 +10.
상한 100. 점수 구간별 마커 색상: <30 gray, 30~59 yellow, 60~89 orange, 90+ red.
"""
import math

from ..models import Detection

CLUSTER_RADIUS_M = 30.0
DAMAGED_CLASSES = {"sidewalk_damaged", "braille_damaged"}


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _level(score: int) -> str:
    if score >= 90:
        return "red"
    if score >= 60:
        return "orange"
    if score >= 30:
        return "yellow"
    return "gray"


def build_clusters(detections: list[Detection]) -> list[dict]:
    """damaged 탐지들을 그리디로 클러스터링해 마커 목록을 만든다."""
    clusters: list[dict] = []
    for det in detections:
        if det.class_name not in DAMAGED_CLASSES or det.verified == "rejected":
            continue
        home = None
        for c in clusters:
            if c["class_name"] == det.class_name and haversine_m(c["lat"], c["lng"], det.lat, det.lng) <= CLUSTER_RADIUS_M:
                home = c
                break
        if home is None:
            clusters.append(
                {
                    "cluster_id": f"c-{len(clusters) + 1}",
                    "lat": det.lat,
                    "lng": det.lng,
                    "class_name": det.class_name,
                    "detections": [det],
                }
            )
        else:
            home["detections"].append(det)

    markers = []
    for c in clusters:
        dets: list[Detection] = c["detections"]
        walk_ids = {d.walk_id for d in dets}
        score = 30  # AI 최초 발견
        if any(d.verified == "confirmed" for d in dets):
            score += 30  # 사용자 승인
        score += 20 * max(0, len(walk_ids) - 1)  # 다른 산책의 재탐지
        score += 10 * max(0, len(dets) - len(walk_ids))  # 같은 산책 내 반복 관측
        score = min(score, 100)
        latest = max(dets, key=lambda d: d.created_at)
        markers.append(
            {
                "cluster_id": c["cluster_id"],
                "lat": sum(d.lat for d in dets) / len(dets),
                "lng": sum(d.lng for d in dets) / len(dets),
                "class_name": c["class_name"],
                "score": score,
                "level": _level(score),
                "detection_count": len(dets),
                "confirmed_count": sum(1 for d in dets if d.verified == "confirmed"),
                "last_seen": latest.created_at,
                "image_url": latest.image_path,
            }
        )
    return markers
