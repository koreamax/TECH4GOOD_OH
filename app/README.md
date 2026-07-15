# app — React Native (Expo) 모바일 앱

## 실행

```bash
npm install
# src/config.ts 에서 API_URL 을 서버(맥) IP로 수정
npx expo prebuild        # 최초 1회 (네이티브 모듈 포함)
npx expo run:ios         # 또는 npx expo run:android
```

- **Expo Go 불가** — vision-camera / fast-tflite / maps 는 네이티브 모듈이라 개발 빌드 필요.
- Android는 `app.json` 의 `android.config.googleMaps.apiKey` 에 실제 키를 넣어야 지도가 뜬다.
  iOS는 Apple Maps 라 키 불필요.
- 시뮬레이터는 카메라가 없어 캡처가 빈 값으로 온다. 데모 QA는 실기기에서 할 것.

## 데모 전 체크리스트 (src/config.ts)

| 항목 | 값 |
|------|----|
| `API_URL` | 데모망 맥 IP (`ipconfig getifaddr en0`) |
| `USE_TFLITE` | 모델 탑재 전 `false`(목 모드) / 탑재 후 `true` |
| `ALERT_CONFIDENCE_THRESHOLD` | 알람 임계값 (기본 0.6) |
| `DOG_NAME` | 데모용 강아지 이름 |

## 목 모드 ↔ 온디바이스 전환

1. `python ml/export_tflite.py --weights <best.pt>` → `assets/models/model.tflite` 생성
2. `src/detection/tfliteDetector.ts` 상단의 `require` 주석 해제
3. `src/config.ts` 의 `USE_TFLITE = true`
4. 앱 재빌드 후 콘솔의 "TFLite 로드 완료. 출력 텐서" 로그로 shape 확인
   (디코더 가정과 다르면 `decodeYoloSeg.ts` 주석 참고)

목 탐지 타이밍 조정: `src/detection/mockDetector.ts` 의 상수 3개.

## 구조

```
src/
├── screens/      # docs/SCREENS.md 의 S-xx 화면들
├── components/   # PrimaryButton, SegmentPill, DetectionDetailModal(승인 게이트) 등
├── detection/    # mockDetector(기본) / tfliteDetector + decodeYoloSeg(온디바이스)
├── store/        # walkStore — 산책 세션 상태 (zustand)
├── api/          # 서버 클라이언트 (docs/API.md)
├── config.ts     # 데모 전 확인할 설정 전부
└── theme.ts      # 피그마 시안 디자인 토큰
```
