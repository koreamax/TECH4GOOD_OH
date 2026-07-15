# 모델 드롭 위치

`ml/export_tflite.py` 실행 시 이 폴더에 `model.tflite` 가 생성된다 (git 미추적).

- 파일명은 반드시 `model.tflite`
- 탑재 후 `app/src/config.ts` 에서 `USE_TFLITE = true`
- 모델이 없으면 목(mock) 탐지 모드로 동작 — 데모 플로우는 동일하다
