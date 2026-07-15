# ml — 모델 변환

학습 자체는 `../gaero`(별도 폴더)에서 진행한다. 여기는 학습된 가중치를 앱에 싣는 변환만 담당.

## 클래스 (학습과 앱이 반드시 일치해야 함)

| id | 클래스 | 알람 |
|----|--------|:---:|
| 0 | sidewalk_normal | — |
| 1 | sidewalk_damaged | O |
| 2 | braille_normal | — |
| 3 | braille_damaged | O |

앱 쪽 매핑은 `app/src/config.ts` 의 `CLASSES` 에 있다. 클래스 수·순서를 바꾸면 양쪽 다 수정할 것.

## 변환

```bash
python export_tflite.py --weights ../gaero/out/runs/surface_4cls_v2/weights/best.pt --half
```

- 출력: `app/assets/models/model.tflite` (git 미추적 — 용량 문제. 팀원에게는 파일 직접 전달)
- `--imgsz` 기본 640. 바꾸면 `app/src/config.ts` 의 `MODEL_INPUT_SIZE` 도 맞출 것.
- TFLite 출력 텐서 형태는 `[1, 4+클래스수+32, anchors]` (seg 모델, nms=False 기준).
  앱 디코더(`app/src/detection/decodeYoloSeg.ts`)가 이 형태를 가정한다.
