# 🐾 Paw Patrol Network

> 매일의 산책이 도시를 순찰합니다.

반려견 산책 중 스마트폰 카메라로 보도·점자블록 파손을 AI가 탐지하고,
사용자 승인(선 승인)을 거쳐 민원 문서를 자동 생성·접수하는 시민참여형 플랫폼입니다.

## 확정 스택

**웹(React) → Vercel · 백엔드(FastAPI) → Docker(+HTTPS 자체 서명) · 추론 = 서버 YOLO(영상 업로드) · 지도 = Naver Maps · LLM = Gemini API · DB = Supabase PostgreSQL**

## 저장소 구조 (모노레포)

```
pawpatrol/
├── web/      # ⭐ React 웹 프론트 (데모 주력, Vercel 배포)
├── server/   # FastAPI 백엔드 (YOLO 추론·신고·지도·Gemini 프록시, Docker)
├── app/      # React Native 프로토타입 (온디바이스 추론 로드맵용 — 데모 대상 아님)
├── ml/       # 모델 변환 스크립트 (RN용 TFLite — 웹 데모에는 불필요)
└── docs/     # 화면 목록 · 작업 분배 · API 명세 · 아키텍처
```

YOLO 학습 코드는 별도 폴더(`../gaero`)에 있습니다. 이 저장소는 서비스 코드만 다룹니다.

## 핵심 플로우

산책 시작 → **데모 영상 재생 + 서버 업로드(`/infer/video`)** → 서버가 시각별 탐지
타임라인 반환(모델 없으면 목) → 재생 시각에 맞춰 "실시간 탐지처럼" 알람 →
신뢰도 임계값 이상이면 알람 → 사용자가 캡처·민원 문안(Gemini 생성) 확인 후 **승인**
→ 민원 접수(데모: 모의 접수) → Naver 위험 지도 마커 등록 → 산책 요약 카드 → 기록 축적

> 웹캠 대신 서버로 영상을 올려 분석하는 구조라 온디바이스 카메라 권한이 필요 없다.
> `web/public/demo-walk.mp4` 를 실제 촬영본으로 교체하면 그대로 데모에 반영된다.

## 빠른 시작 (로컬)

### 1. 서버

```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # 키가 없어도 전부 폴백으로 동작
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 웹

```bash
cd web
npm install
cp .env.example .env        # VITE_API_URL, VITE_NAVER_MAP_CLIENT_ID
npm run dev                 # http://localhost:5173
```

`VITE_NAVER_MAP_CLIENT_ID` 가 비어 있으면 지도는 폴백 UI 로 표시되고 나머지 플로우는
그대로 동작합니다. NCP 콘솔 → Maps 에서 Client ID 발급 후 넣으면 실제 지도가 뜹니다.

### 3. Docker + HTTPS(자체 서명)

```bash
cd server && sh scripts/gen-cert.sh        # server/certs/{cert,key}.pem 생성
cd .. && docker compose up --build         # https://localhost:8443
```

웹 `.env` 의 `VITE_API_URL` 을 `https://localhost:8443` 로 맞추면 HTTPS 백엔드로 붙습니다.
(자체 서명 인증서라 브라우저 1회 경고는 정상.)

### 4. 모델 (파인튜닝 완료 후)

`best.pt` 를 `server/models/` 에 넣고 `.env`(또는 compose 환경변수)에
`MODEL_PATH=models/best.pt`. 모델이 없는 동안은 **목 타임라인**으로 전체 데모 플로우가
그대로 동작합니다.

## 배포

| 구성 | 위치 | 방법 |
|------|------|------|
| 웹 | Vercel | 저장소 연결, Root Directory=`web`, env `VITE_API_URL`·`VITE_NAVER_MAP_CLIENT_ID` (자동 HTTPS) |
| 백엔드 | Docker | `server/Dockerfile` + `docker-compose.yml` — **자체 서명 인증서로 HTTPS**(`scripts/gen-cert.sh` → `certs/` 마운트). `SSL_CERTFILE/SSL_KEYFILE` 미지정 시 HTTP 로 떠서 상위(Cloud Run/Railway/Caddy)가 TLS 종료하는 구성도 가능 |
| DB | Supabase | PostgreSQL URI를 서버 env `DATABASE_URL` 로 주입 (미설정 시 SQLite) |

프론트가 HTTPS(Vercel)면 백엔드도 HTTPS여야 혼합 콘텐츠 차단을 피합니다.

## 문서

- [화면 목록·플로우](docs/SCREENS.md)
- [작업 분배·일정](docs/TASKS.md)
- [아키텍처](docs/ARCHITECTURE.md)

## 팀

TECH4GOOD 해커톤 — Paw Patrol Network 팀
