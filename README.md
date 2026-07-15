# 🐾 Paw Patrol Network — *Mission Pawss!ble*

> **매일의 산책이 도시를 순찰합니다.**
> 반려견 산책으로 도시 위험을 발견하고, 지자체와 연결하는 시민참여 플랫폼

<sub>SK텔레콤 × 하나금융그룹 2026 TECH4GOOD 해커톤 · 팀 **OH! (5조)**</sub>

---

## 1. 프로젝트 소개

길을 걷다 파손된 보도블록·점자블록에 걸려 넘어질 뻔한 경험, 누구나 있습니다.
점자블록 파손·훼손 민원만 3년간 **1,257건(관련 민원 중 1위, 44.2%)**, 튀어나온 보도블록에 걸려 전치 12주 사고까지 — **도시의 위험은 늘 "누군가 다치고 나서야" 발견됩니다.**

기존 '반려견 순찰대' 같은 시도가 있었지만 모두 **사람의 눈**에 의존해 주관적·수동적이고, 노면 파손 같은 위험은 놓치기 쉬웠습니다.

**Paw Patrol Network**는 매일 반복되는 반려견 산책을 도시 안전 데이터로 바꿉니다.
산책 중 스마트폰(하네스형) 카메라로 촬영하면 **AI가 깨진 보도블록·점자블록을 자동으로 탐지**하고, 사용자 승인을 거쳐 **안전신문고 민원까지 자동 생성**합니다. 별도 교육·심사, 사람의 눈으로 하는 관찰, 민원 작성 모두 불필요 — **앱만 켜면 참여**할 수 있습니다.

**한 번의 산책, 세 사람이 누리는 가치**

| 대상 | 가치 |
|---|---|
| 🧑‍🦯 **반려인(사용자)** | 경로·거리·시간을 기록하며 반려견 활동을 관리하고, 일상 산책으로 도시 안전에 기여 |
| 🏛 **지자체** | 산책 데이터로 생활 위험 요소를 파악하고, 필요한 곳을 빠르게 정비 (민원↓, 효율↑) |
| 👵 **이동약자** | 방치되던 보행 위험이 개선되어 시각장애인·휠체어 이용자·고령자의 이동 환경 향상 |

---

## 2. 주요 기능

산책 시작 → 실시간 AI 탐지 → 원터치 신고 → 산책 기록의 한 흐름으로 동작합니다.

- **🐕 산책 시작 & 코스** — 시작 버튼 한 번으로 카메라·GPS가 켜지고 탐지 세션 시작. 나의 코스/추천 코스/신고 현황 제공
- **📸 실시간 파손 탐지** — AI가 카메라 프레임을 지속 분석해 **보도블록·점자블록 파손을 실시간 탐지**하고, 파손 영역을 마스킹으로 표시
- **🔔 감지 알림 & 교차 검증** — 파손 감지 시 진동·사운드 알림 + 파손 영역 사진 표시. 사용자가 "잘 인식됐는지" 확인(오탐은 재학습 데이터로 축적)
- **📝 원터치 민원 작성** — AI가 감지 정보로 **안전신문고 민원 문안을 자동 작성**(발생지역·제목·신고내용). 사용자가 확인·수정 후 제출
- **🗺 위험 지도** — 신고 지점을 지도 마커로 시각화. 같은 지점 반복 탐지·승인 여부로 **신뢰도 점수(색상 단계)** 산정
- **📊 산책 요약 & 기록** — 산책 종료 시 코스·거리·시간·발견/신고 내역을 타임라인으로 요약해 안전 지도 데이터로 축적

---

## 3. 사용 기술

**AI 탐지 모델**
- **모델**: YOLO Segmentation (`yolo11n-seg`) — ①원본이 폴리곤 ②파손 영역 자체를 마스킹해 검증이 직관적 ③데모 효과가 강함
- **데이터**: AI-Hub 「인도보행 영상」(국내, 총 67만 건) 중 Surface Masking 폴리곤 5만 건
- **라벨**: `sidewalk` / `braille_guide_blocks` + `damaged` → 2개 클래스(`sidewalk_damaged`, `braille_damaged`) 추출
- **전처리**: 다운로드 → damaged 추출 → 폴리곤 → YOLO Seg 변환 → Train/Val/Test 분리 + `data.yaml`

**서비스 스택**

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React 18 + Vite + TypeScript, React Router, Zustand → **Vercel** 배포 |
| 백엔드 | **FastAPI**(Python 3.11) + Uvicorn, SQLAlchemy → **Docker**(자체 서명 HTTPS) |
| AI 추론 | Ultralytics YOLO11 (서버 사이드, 영상 업로드 방식) |
| 지도 | Naver Maps v3 |
| LLM(민원 문안) | Gemini API (`google-genai`) — 키 없으면 템플릿 폴백 |
| DB | **Supabase** PostgreSQL (미설정 시 SQLite 폴백) |
| 인프라(목표) | AWS(ECR·EC2/Docker·ALB·NAT·ACM·SQS, Auto Scaling) — 발표용 아키텍처 |

> 모든 외부 키/모델은 **폴백 설계**: 키·모델이 없어도 전체 데모 플로우가 그대로 동작합니다.

---

## 4. 실행 방법 / 확인 방법

### 저장소 구조 (모노레포)
```
TECH4GOOD_OH/
├── web/      # ⭐ React 웹 프론트 (데모 주력, Vercel)
├── server/   # FastAPI 백엔드 (YOLO 추론·신고·지도·Gemini, Docker)
├── app/      # React Native 프로토타입 (로드맵용, 데모 대상 아님)
├── ml/       # 모델 변환 스크립트
└── docs/     # 화면·API 명세·아키텍처
```

### 로컬 실행

```bash
# 1) 백엔드 (Docker — best.pt 포함, https://localhost:8443)
cd server && sh scripts/gen-cert.sh          # 자체 서명 인증서 생성 (certs/)
# server/.env 에 MODEL_PATH=/srv/models/best.pt (모델 실추론), DATABASE_URL(Supabase) 등
cd .. && docker compose --env-file server/.env up --build -d

# 2) 웹 (http://localhost:5173)
cd web && npm install
cp .env.example .env                         # VITE_API_URL, VITE_NAVER_MAP_CLIENT_ID
npm run dev
```

로컬에서 백엔드에 붙이려면 `web/.env`의 `VITE_API_URL`을 `https://localhost:8443`으로 맞춥니다(자체 서명이라 브라우저 1회 경고는 정상).

### 배포

| 구성 | 위치 | 방법 |
|---|---|---|
| 웹 | **Vercel** | Root Directory=`web`, `vercel --prod`. env: `VITE_API_URL`, `VITE_NAVER_MAP_CLIENT_ID` |
| 백엔드 | **Docker** | `docker compose --env-file server/.env up --build -d` → `https://localhost:8443` |
| DB | **Supabase** | `DATABASE_URL`(Transaction Pooler, IPv4)로 주입 |

- 🌐 **웹(라이브)**: https://web-six-theta-f7wm1jo00d.vercel.app
- 📄 **API 문서(서버 기동 시)**: `https://localhost:8443/docs` (Swagger UI) · `/redoc` · `/openapi.json`

### 동작 확인
```bash
curl -k https://localhost:8443/health          # {"status":"ok"}
curl -k -X POST https://localhost:8443/infer -F image=@server/scripts/sample-damage.jpg
# 모델 로드 시 {"model":"loaded", ...}  /  없으면 {"model":"absent", ...}(목 모드)
```

> Windows에서 `git` 체크아웃 시 `server/start.sh`가 CRLF로 바뀌면 컨테이너가 `set: Illegal option -`로 죽을 수 있습니다. LF로 변환하거나 `.gitattributes`에 `*.sh text eol=lf`를 추가하세요.

---

## 5. 팀원별 역할

**팀 OH! (5조)**

| 역할 | 담당 |
|---|---|
| 👑 팀장 | 이민형 |
| 💻 개발 | 이다빈, 조대흠 |
| 🎨 디자인 | 여아현 |
| 📋 기획 | 고대웅, 박수호 |
| 🎤 발표 | 이은아 |

---

## 문서
- [화면 목록·플로우](docs/SCREENS.md) · [작업 분배](docs/TASKS.md) · [아키텍처](docs/ARCHITECTURE.md)
- [API 명세(Markdown)](docs/API-SPEC.md) · [Swagger UI(오프라인 HTML)](docs/api.html)
