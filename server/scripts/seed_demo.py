"""데모 시드 — 산책 기록·탐지·신고를 DB에 주입해 홈/신고 현황/산책 지도를 채운다.

사용:
    cd server && .venv/bin/python scripts/seed_demo.py

재실행 안전: user_name='콩이 보호자' 시드 데이터를 지우고 다시 넣는다.
"""
import json
import shutil
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import Detection, Report, Walk  # noqa: E402
from app.services.storage import MEDIA_DIR  # noqa: E402

SAMPLE_IMG = Path(__file__).parent / "sample-damage.jpg"
SEED_USER = "콩이 보호자"


def lerp_route(points: list[tuple[float, float]], per_seg: int, start: datetime) -> list[dict]:
    """꼭짓점 사이를 보간해 부드러운 경로 생성."""
    out = []
    t = start
    for a, b in zip(points, points[1:]):
        for i in range(per_seg):
            f = i / per_seg
            out.append(
                {
                    "lat": round(a[0] + (b[0] - a[0]) * f, 6),
                    "lng": round(a[1] + (b[1] - a[1]) * f, 6),
                    "t": t.isoformat(timespec="seconds"),
                }
            )
            t += timedelta(seconds=45)
    out.append({"lat": points[-1][0], "lng": points[-1][1], "t": t.isoformat(timespec="seconds")})
    return out


# 석촌호수 동호 (홈 목업 카드 '석촌 호수'와 대응)
SEOKCHON = [
    (37.51065, 127.09835), (37.5109, 127.1004), (37.5108, 127.10184),
    (37.51046, 127.10314), (37.50988, 127.10412), (37.50912, 127.10462),
    (37.5083, 127.1045), (37.5077, 127.10378), (37.50748, 127.10272),
    (37.50766, 127.10158), (37.50822, 127.10066), (37.50902, 127.1002),
]
# 오금공원 (홈 목업 카드 '오금 공원'과 대응)
OGEUM = [
    (37.50236, 127.12694), (37.50292, 127.12758), (37.50334, 127.12852),
    (37.50302, 127.12946), (37.50232, 127.12912),
]


def main() -> None:
    Base.metadata.create_all(engine)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    now = datetime.now()

    # 기존 시드 제거 (시드 산책에 연결된 탐지·신고 → 산책 순)
    old_walks = db.query(Walk).filter(Walk.user_name == SEED_USER).all()
    for w in old_walks:
        dets = db.query(Detection).filter(Detection.walk_id == w.id).all()
        for d in dets:
            db.query(Report).filter(Report.detection_id == d.id).delete()
            db.delete(d)
        db.delete(w)
    db.commit()

    def add_walk(points, start, duration_min, distance_m, detections_spec):
        route = lerp_route(points, per_seg=3, start=start)
        walk = Walk(
            started_at=start.isoformat(timespec="seconds"),
            ended_at=(start + timedelta(minutes=duration_min)).isoformat(timespec="seconds"),
            distance_m=distance_m,
            duration_s=duration_min * 60,
            route_json=json.dumps(route),
            user_name=SEED_USER,
        )
        db.add(walk)
        db.commit()
        db.refresh(walk)

        for frac, class_name, conf, report_title in detections_spec:
            pt = route[int(len(route) * frac)]
            det = Detection(
                walk_id=walk.id,
                class_name=class_name,
                confidence=conf,
                lat=pt["lat"],
                lng=pt["lng"],
                verified="confirmed" if report_title else "pending",
                created_at=pt["t"],
            )
            db.add(det)
            db.commit()
            db.refresh(det)
            if SAMPLE_IMG.exists():
                target = MEDIA_DIR / "detections" / f"{det.id}.jpg"
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(SAMPLE_IMG, target)
                det.image_path = f"/media/detections/{det.id}.jpg"
            if report_title:
                created = datetime.fromisoformat(pt["t"])
                report = Report(
                    detection_id=det.id,
                    title=report_title,
                    content=(
                        "반려견 산책 중 해당 지점에서 파손 상태를 발견하여 신고합니다. "
                        "보행자가 걸려 넘어지는 등 안전사고 우려가 있으니 현장 확인과 보수 조치를 요청드립니다."
                    ),
                    address="서울 송파구",
                    receipt_no=f"SPP-{created.strftime('%Y%m%d')}-{det.id:04d}",
                    created_at=created.isoformat(timespec="seconds"),
                )
                db.add(report)
            db.commit()
        return walk

    # 어제 저녁 석촌호수: 탐지 3건 중 신고 2건 (반복 관측 클러스터 형성)
    add_walk(
        SEOKCHON,
        now - timedelta(days=1, hours=3),
        35,
        2000,
        [
            (0.25, "braille_damaged", 0.86, "석촌호수로 보도 점자블록 파손 신고"),
            (0.55, "sidewalk_damaged", 0.78, "석촌호수 산책로 보도블록 파손 신고"),
            (0.8, "sidewalk_damaged", 0.52, None),  # 임계값 미만 — 조용한 축적 사례
        ],
    )
    # 사흘 전 석촌호수: 같은 지점대 재탐지 1건 신고 (신뢰도 점수 상승 시연)
    add_walk(
        SEOKCHON,
        now - timedelta(days=3, hours=2),
        33,
        1900,
        [(0.26, "braille_damaged", 0.81, "석촌호수로 점자블록 파손 재신고")],
    )
    # 그저께 오금공원: 신고 1건
    add_walk(
        OGEUM,
        now - timedelta(days=2, hours=5),
        13,
        500,
        [(0.5, "sidewalk_damaged", 0.74, "오금공원 진입로 보도 파손 신고")],
    )

    walks = db.query(Walk).filter(Walk.user_name == SEED_USER).count()
    dets = db.query(Detection).count()
    reports = db.query(Report).count()
    print(f"[ok] 시드 완료 — walks {walks}, detections {dets}, reports {reports}")
    db.close()


if __name__ == "__main__":
    main()
