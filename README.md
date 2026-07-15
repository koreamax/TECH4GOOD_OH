# 🐾 Paw Patrol Network

> 매일의 산책이 도시를 순찰합니다.

반려견 산책 중 스마트폰 카메라로 보도·점자블록 파손을 AI가 탐지하고,
사용자 승인(선 승인)을 거쳐 민원 문서를 자동 생성·접수하는 시민참여형 플랫폼입니다.

## 확정 스택

**웹(React) → Vercel · 백엔드(FastAPI) → Docker(+HTTPS) · 추론 = 서버 YOLO · LLM = Gemini API · DB = Supabase PostgreSQL**

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

산책 시작 → 카메라 프레임 → YOLO 탐지(서버 `/infer`, 모델 없으면 목 모드) →
신뢰도 임계값 이상이면 알람 → 사용자가 캡처·민원 문안(Gemini 생성) 확인 후 **승인**
→ 민원 접수(데모: 모의 접수) → 위험 지도 마커 등록 → 산책 요약 카드 → 기록 축적

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
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm run dev                 # http://localhost:5173
```

### 3. 모델 (파인튜닝 완료 후)

`best.pt` 를 `server/models/` 에 넣고 `.env` 에 `MODEL_PATH=models/best.pt`,
웹 `.env` 에 `VITE_USE_SERVER_INFER=true`. 모델이 없는 동안은 **목 탐지 모드**로
전체 데모 플로우가 그대로 동작합니다.

## 배포

| 구성 | 위치 | 방법 |
|------|------|------|
| 웹 | Vercel | 저장소 연결, Root Directory=`web`, env `VITE_API_URL` (자동 HTTPS) |
| 백엔드 | Docker | `server/Dockerfile` — Cloud Run/Railway 등 **TLS 종료를 대신해주는 플랫폼 권장** (인증서 직접 관리 불필요). 자체 VM이면 Caddy 리버스 프록시로 Let's Encrypt 자동 발급 |
| DB | Supabase | PostgreSQL URI를 서버 env `DATABASE_URL` 로 주입 (미설정 시 SQLite) |

웹 카메라(getUserMedia)는 HTTPS 필수라서 프론트·백 모두 HTTPS여야 합니다.

## 문서

- [화면 목록·플로우](docs/SCREENS.md)
- [작업 분배·일정](docs/TASKS.md)
- [아키텍처](docs/ARCHITECTURE.md)

## 팀

TECH4GOOD 해커톤 — Paw Patrol Network 팀
