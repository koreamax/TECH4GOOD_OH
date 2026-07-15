# web — React 웹 프론트 (데모 주력)

모바일 브라우저 대상 웹앱. 카메라(getUserMedia) + GPS(Geolocation) + Leaflet(OSM) 지도 —
지도 API 키 불필요.

## 로컬 실행

```bash
npm install
cp .env.example .env    # VITE_API_URL 확인
npm run dev             # http://localhost:5173
```

폰에서 보려면 맥과 같은 와이파이에서 `http://<맥IP>:5173` 접속.
**주의: 카메라는 HTTPS 또는 localhost 에서만 동작.** 폰 테스트 시 카메라가 필요하면
`npx vite --host` 대신 터널(`cloudflared tunnel --url http://localhost:5173`)로 HTTPS URL을 쓰거나
Vercel 프리뷰 배포를 쓸 것.

## Vercel 배포

1. Vercel 프로젝트 생성 → 이 저장소 연결, **Root Directory = `web`**
2. 환경변수: `VITE_API_URL` = 백엔드 HTTPS URL, `VITE_USE_SERVER_INFER` = `true`(모델 배포 시)
3. 프론트가 HTTPS 라서 백엔드도 HTTPS 필수 (혼합 콘텐츠 차단) — server/README.md 배포 절 참고

## 추론 모드

| VITE_USE_SERVER_INFER | 동작 |
|---|---|
| `false` (기본) | 목 탐지 모드 — 모델 없이 전체 플로우 데모 (`src/detection/mock.ts` 로 타이밍 조정) |
| `true` | 산책 중 1.5초마다 프레임을 `POST /infer` 로 보내 서버 YOLO 탐지 |

두 모드 모두 같은 선(先) 승인 게이트를 탄다: 신뢰도 임계값(0.6) 이상만 알람 →
사용자가 Gemini 민원 문안 확인 후 [신고하기] → 모의 접수.

## 구조

```
src/
├── pages/        # docs/SCREENS.md 의 S-xx 화면들 (Walk가 핵심)
├── components/   # TabBar, DetectionModal(승인 게이트), MiniRouteMap 등
├── detection/    # mock.ts — 목 탐지기
├── store.ts      # 산책 세션 상태 (zustand)
├── api.ts        # 서버 클라이언트 (docs/API.md)
├── config.ts     # 임계값·클래스·데모 프로필
└── theme.css     # 피그마 시안 디자인 토큰
```
