# web — React 웹 프론트 (데모 주력)

모바일 브라우저 대상 웹앱. **데모 영상 업로드**(웹캠 대체) + GPS(Geolocation) + **Naver 지도**.

산책 화면은 웹캠 대신 **번들 데모 영상**(`public/demo-walk.mp4`)을 전체화면으로 재생하고,
그 영상을 백엔드 `POST /infer/video` 로 업로드한다. 서버가 (모델 있으면 실제 YOLO,
없으면 목) **시각별 탐지 타임라인**을 돌려주면, 프론트가 영상 재생 시각에 맞춰
"실시간 탐지처럼" 알림을 띄운다. 실제 촬영본으로 교체하려면 `public/demo-walk.mp4` 를
바꾸거나 `VITE_DEMO_VIDEO` 로 다른 경로를 지정한다.

## 로컬 실행

```bash
npm install
cp .env.example .env    # VITE_API_URL, VITE_NAVER_MAP_CLIENT_ID 확인
npm run dev             # http://localhost:5173
```

폰에서 보려면 같은 와이파이에서 `http://<PC IP>:5173` 접속.

## 환경변수

| 변수 | 용도 |
|---|---|
| `VITE_API_URL` | 백엔드 주소 (배포 시 HTTPS 필수 — 혼합 콘텐츠 차단) |
| `VITE_NAVER_MAP_CLIENT_ID` | Naver 지도 Client ID(NCP). **없으면 지도 자리에 폴백 UI** (플로우는 계속 동작) |
| `VITE_DEMO_VIDEO` | 산책 화면 데모 영상 경로 (기본 `/demo-walk.mp4`) |
| `VITE_USE_SERVER_INFER` | (레거시) 단일 프레임 추론 토글 — 영상 업로드 플로우엔 영향 없음 |

## Vercel 배포

1. Vercel 프로젝트 생성 → 이 저장소 연결, **Root Directory = `web`**
2. 환경변수: `VITE_API_URL`(백엔드 HTTPS URL), `VITE_NAVER_MAP_CLIENT_ID`
3. 프론트가 HTTPS 라서 백엔드도 HTTPS 필수 — server/README.md 배포 절 참고

## 탐지 플로우

영상 업로드 → 서버 타임라인 수신 → 재생 시각에 맞춰 탐지 이벤트 발생 →
신뢰도 임계값(0.6) 이상만 알람(선 승인 게이트) → 사용자가 Gemini 민원 문안 확인 후
[신고하기] → 모의 접수. 서버 연결 실패 시 로컬 목 탐지(`src/detection/mock.ts`)로 폴백.

## 구조

```
src/
├── pages/        # docs/SCREENS.md 의 S-xx 화면들 (Walk가 핵심)
├── components/   # TabBar, DetectionModal(승인 게이트), WalkMapOverlay, MiniRouteMap 등
├── naver/        # Naver 지도 로더 훅(useNaverMaps) · 타입 · 폴백 UI
├── detection/    # mock.ts — 서버 불가 시 폴백 목 탐지기
├── store.ts      # 산책 세션 상태 (zustand)
├── api.ts        # 서버 클라이언트 (inferVideo 포함, docs/API.md)
├── config.ts     # 임계값·클래스·데모 프로필·env
└── theme.css     # 피그마 시안 디자인 토큰
```
