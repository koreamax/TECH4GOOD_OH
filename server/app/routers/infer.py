"""서버 YOLO 추론 — 웹 프론트가 프레임(JPEG)을 보내면 탐지 결과를 돌려준다.

MODEL_PATH 미설정·ultralytics 미설치면 {"model": "absent"} 를 반환하고,
프론트는 목 탐지 모드로 동작한다 (플로우 무중단).
"""
import io
import os
import threading

from fastapi import APIRouter, File, UploadFile

router = APIRouter(prefix="/infer", tags=["infer"])

_lock = threading.Lock()
_model = None
_model_error: str | None = None


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
