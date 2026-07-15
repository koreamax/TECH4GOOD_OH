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

# v3 모델은 클래스명이 damaged_sidewalk/damaged_braille 순서 — 코드 전반의
# 표준 명칭(sidewalk_damaged/braille_damaged)으로 정규화한다.
_NAME_MAP = {"damaged_sidewalk": "sidewalk_damaged", "damaged_braille": "braille_damaged"}


def _norm(name: str) -> str:
    return _NAME_MAP.get(name, name)


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
                    "class_name": _norm(result.names[cls_id]),
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


def _mask_polygon(result, idx: int, max_points: int = 60) -> list[list[float]] | None:
    """seg 모델의 idx번째 인스턴스 마스크를 정규화 폴리곤(점 수 상한)으로."""
    masks = getattr(result, "masks", None)
    if masks is None:
        return None
    try:
        xyn = masks.xyn[idx]  # (N, 2) 정규화 폴리곤 좌표
    except (IndexError, TypeError):
        return None
    pts = xyn.tolist() if hasattr(xyn, "tolist") else list(xyn)
    if not pts:
        return None
    if len(pts) > max_points:  # 페이로드·드로잉 비용 억제
        stride = len(pts) / max_points
        pts = [pts[int(k * stride)] for k in range(max_points)]
    return [[round(float(px), 4), round(float(py), 4)] for px, py in pts]


def _best_damaged(result, t: float) -> dict | None:
    """한 프레임에서 신뢰도 최고의 파손 탐지 1건을 박스+마스크로."""
    if result.boxes is None:
        return None
    best_i, best_c, best_name, best_box = -1, -1.0, "", None
    for i, box in enumerate(result.boxes):
        name = _norm(result.names[int(box.cls[0])])
        c = float(box.conf[0])
        if name in _DAMAGED and c > best_c:
            x1, y1, x2, y2 = (float(v) for v in box.xyxyn[0])
            best_i, best_c, best_name, best_box = i, c, name, {
                "x1": x1, "y1": y1, "x2": x2, "y2": y2,
            }
    if best_i < 0:
        return None
    item = {"t": round(t, 2), "class_name": best_name, "confidence": round(best_c, 3), "box": best_box}
    mask = _mask_polygon(result, best_i)
    if mask is not None:
        item["mask"] = mask
    return item


def _peak_detections(overlay: list[dict], cooldown: float = 15.0) -> list[dict]:
    """밀집 overlay에서 쿨다운 창별 '최고 신뢰도' 프레임만 남긴 알람 타임라인.

    이전엔 창 내 '첫' 탐지를 방출해 강한 프레임(예: 0.79)이 눌렸으나,
    이제 창 내 피크를 뽑아 실제로 가장 확실한 순간이 승인 게이트를 띄운다.
    """
    ov = sorted(overlay, key=lambda d: d["t"])
    peaks: list[dict] = []
    i, n = 0, len(ov)
    while i < n:
        start = ov[i]["t"]
        best = ov[i]
        j = i
        while j < n and ov[j]["t"] < start + cooldown:
            if ov[j]["confidence"] > best["confidence"]:
                best = ov[j]
            j += 1
        peaks.append(best)
        i = j
    return peaks


def _video_timeline(
    data: bytes, conf: float, sample_fps: float
) -> tuple[float, list[dict], list[dict]]:
    """모델이 있을 때: 프레임 샘플링 → 실제 YOLO 추론.

    반환: (영상 길이, detections, overlay)
    - overlay : 샘플 프레임마다 최강 파손 탐지(박스+마스크). 실시간 오버레이용, 쿨다운 없음.
    - detections : overlay에서 쿨다운 창별 피크만 뽑은 알람 타임라인.
    추론은 프레임당 1회뿐이라 overlay를 추가해도 비용은 늘지 않는다.
    """
    import tempfile

    import cv2  # ultralytics(opencv) 의존성에 포함

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    overlay: list[dict] = []
    duration = 0.0
    try:
        cap = cv2.VideoCapture(tmp_path)
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        duration = (total / src_fps) if src_fps else 0.0
        step = max(int(round(src_fps / max(sample_fps, 0.1))), 1)
        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if idx % step == 0:
                item = _best_damaged(_model.predict(frame, conf=conf, verbose=False)[0], idx / src_fps)
                if item is not None:
                    overlay.append(item)
            idx += 1
        cap.release()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
    return duration, _peak_detections(overlay), overlay


@router.post("/video")
async def infer_video(
    video: UploadFile = File(...),
    duration: float = Form(0.0),      # 프론트가 아는 영상 길이(초) — 목 타임라인용
    conf: float = Form(0.35),
    sample_fps: float = Form(2.0),
):
    """영상 업로드 → 시각(t)별 탐지 타임라인.

    반환: {"model": "loaded"|"absent", "duration": float,
           "detections": [{"t","class_name","confidence","box"}],   # 알람(피크)
           "overlay":    [{"t","class_name","confidence","box","mask?"}]}  # 실시간 오버레이
    """
    data = await video.read()
    _load()
    if _model is None:
        mock = _mock_timeline(data or video.filename.encode(), duration)
        return {
            "model": "absent",
            "reason": _model_error,
            "duration": duration,
            "detections": mock,
            "overlay": mock,  # 모델 부재 시 목 박스를 오버레이로 재사용(마스크 없음)
        }
    src_duration, detections, overlay = _video_timeline(data, conf, sample_fps)
    return {
        "model": "loaded",
        "duration": src_duration or duration,
        "detections": detections,
        "overlay": overlay,
    }
