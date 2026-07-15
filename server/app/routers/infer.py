"""서버 YOLO 추론.

- POST /infer        : 단일 프레임(JPEG) 추론 (레거시 — 온디바이스/프레임 스트리밍용)
- POST /infer/video  : 영상 업로드 → 타임라인 탐지 (웹 데모 주력 경로)

MODEL_PATH 미설정·ultralytics 미설치면 목(mock) 결과를 돌려주고, 프론트는
동일한 파이프라인으로 "실시간 탐지처럼" 동작한다 (플로우 무중단).
"""
import hashlib
import io
import os
import threading

from fastapi import APIRouter, File, Form, UploadFile

router = APIRouter(prefix="/infer", tags=["infer"])

_lock = threading.Lock()
_model = None
_model_error: str | None = None

# 목 타임라인 파라미터
_MOCK_FIRST_T = 4.0          # 첫 탐지 시각(초)
_MOCK_GAP = 7.0              # 탐지 간 평균 간격(초)
_DAMAGED = ["sidewalk_damaged", "braille_damaged"]


def _load():
    global _model, _model_error
    with _lock:
        if _model is not None or _model_error is not None:
            return
        path = os.getenv("MODEL_PATH", "").strip()
        if not path:
            _model_error = "MODEL_PATH 미설정"
            return
        try:
            from ultralytics import YOLO

            _model = YOLO(path)
        except Exception as e:  # 미설치/가중치 없음 — 목 모드 폴백
            _model_error = f"{type(e).__name__}: {e}"


@router.post("")
def infer(image: UploadFile = File(...), conf: float = 0.35):
    _load()
    if _model is None:
        return {"model": "absent", "reason": _model_error, "detections": []}

    from PIL import Image  # ultralytics 의존성에 포함

    img = Image.open(io.BytesIO(image.file.read())).convert("RGB")
    result = _model.predict(img, conf=conf, verbose=False)[0]
    detections = []
    if result.boxes is not None:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            x1, y1, x2, y2 = (float(v) for v in box.xyxyn[0])
            detections.append(
                {
                    "class_name": result.names[cls_id],
                    "confidence": round(float(box.conf[0]), 3),
                    "box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},  # 0~1 정규화
                }
            )
    return {"model": "loaded", "detections": detections}


def _mock_timeline(seed: bytes, duration: float) -> list[dict]:
    """업로드 영상 길이에 맞춰 결정적(deterministic) 타임라인을 만든다.

    같은 영상이면 항상 같은 결과 → 데모 재현성 확보. 8할은 임계값(0.6) 이상,
    2할은 미만(조용한 축적 경로 시연)이 되도록 신뢰도를 배치한다.
    """
    dur = duration if duration and duration > 0 else 15.0
    h = int.from_bytes(hashlib.sha256(seed).digest()[:8], "big")
    out: list[dict] = []
    t = _MOCK_FIRST_T
    i = 0
    while t < max(dur - 1.0, _MOCK_FIRST_T + 0.1):
        r = (h >> (i * 5)) & 0x1F  # 0~31 의사난수
        class_name = _DAMAGED[0] if r % 10 < 7 else _DAMAGED[1]
        if r % 10 < 8:
            confidence = round(0.62 + (r % 32) / 31 * 0.31, 2)  # 0.62~0.93
        else:
            confidence = round(0.40 + (r % 20) / 19 * 0.19, 2)  # 0.40~0.59
        # 화면 중앙 하단 근처의 그럴듯한 박스(0~1 정규화)
        cx = 0.35 + (r % 7) / 20
        cy = 0.55 + (r % 5) / 25
        out.append(
            {
                "t": round(t, 2),
                "class_name": class_name,
                "confidence": confidence,
                "box": {"x1": cx - 0.12, "y1": cy - 0.1, "x2": cx + 0.12, "y2": cy + 0.1},
            }
        )
        t += _MOCK_GAP + (r % 6)  # 7~12초 간격
        i += 1
    return out


def _video_timeline(data: bytes, conf: float, sample_fps: float) -> tuple[float, list[dict]]:
    """모델이 있을 때: 영상 프레임을 샘플링해 실제 YOLO 추론 → 타임라인."""
    import tempfile

    import cv2  # ultralytics(opencv) 의존성에 포함

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    detections: list[dict] = []
    duration = 0.0
    try:
        cap = cv2.VideoCapture(tmp_path)
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        duration = (total / src_fps) if src_fps else 0.0
        step = max(int(round(src_fps / max(sample_fps, 0.1))), 1)
        idx = 0
        last_emit = -999.0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if idx % step == 0:
                t = idx / src_fps
                result = _model.predict(frame, conf=conf, verbose=False)[0]
                best = None
                if result.boxes is not None:
                    for box in result.boxes:
                        name = result.names[int(box.cls[0])]
                        c = float(box.conf[0])
                        if name in _DAMAGED and (best is None or c > best[1]):
                            x1, y1, x2, y2 = (float(v) for v in box.xyxyn[0])
                            best = (name, c, (x1, y1, x2, y2))
                # 15초 쿨다운(프론트 UX와 동일)으로 연속 프레임 중복 억제
                if best and t - last_emit >= 15.0:
                    last_emit = t
                    detections.append(
                        {
                            "t": round(t, 2),
                            "class_name": best[0],
                            "confidence": round(best[1], 3),
                            "box": {
                                "x1": best[2][0], "y1": best[2][1],
                                "x2": best[2][2], "y2": best[2][3],
                            },
                        }
                    )
            idx += 1
        cap.release()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
    return duration, detections


@router.post("/video")
async def infer_video(
    video: UploadFile = File(...),
    duration: float = Form(0.0),      # 프론트가 아는 영상 길이(초) — 목 타임라인용
    conf: float = Form(0.35),
    sample_fps: float = Form(2.0),
):
    """영상 업로드 → 시각(t)별 탐지 타임라인.

    반환: {"model": "loaded"|"absent", "duration": float,
           "detections": [{"t", "class_name", "confidence", "box"}]}
    """
    data = await video.read()
    _load()
    if _model is None:
        return {
            "model": "absent",
            "reason": _model_error,
            "duration": duration,
            "detections": _mock_timeline(data or video.filename.encode(), duration),
        }
    src_duration, detections = _video_timeline(data, conf, sample_fps)
    return {
        "model": "loaded",
        "duration": src_duration or duration,
        "detections": detections,
    }
