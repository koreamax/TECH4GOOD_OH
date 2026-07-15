"""yolo11n-seg best.pt → TFLite 변환 후 앱 assets 폴더로 복사.

사용법:
    pip install ultralytics
    python export_tflite.py --weights ../gaero/out/runs/surface_4cls_v2/weights/best.pt

변환이 끝나면 app/assets/models/model.tflite 가 생기고,
app/src/config.ts 의 USE_TFLITE 를 true 로 바꾸면 온디바이스 추론으로 전환된다.
"""
import argparse
import shutil
from pathlib import Path

APP_MODEL_PATH = Path(__file__).resolve().parent.parent / "app" / "assets" / "models" / "model.tflite"


def main() -> None:
    parser = argparse.ArgumentParser(description="best.pt -> TFLite -> app assets")
    parser.add_argument("--weights", required=True, help="학습된 .pt 경로")
    parser.add_argument("--imgsz", type=int, default=640, help="입력 크기 (앱 디코더와 일치해야 함)")
    parser.add_argument("--half", action="store_true", help="fp16 양자화 (기본 권장)")
    parser.add_argument("--int8", action="store_true", help="int8 양자화 (캘리브레이션 데이터 필요)")
    args = parser.parse_args()

    from ultralytics import YOLO

    model = YOLO(args.weights)
    exported = model.export(format="tflite", imgsz=args.imgsz, half=args.half, int8=args.int8, nms=False)

    APP_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(exported, APP_MODEL_PATH)
    print(f"[ok] {exported} -> {APP_MODEL_PATH}")
    print("app/src/config.ts 에서 USE_TFLITE = true 로 변경하세요.")


if __name__ == "__main__":
    main()
