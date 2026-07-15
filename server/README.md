# server — FastAPI 백엔드

영상 추론(`/infer/video`) · 신고 저장 · 위험 지도(신뢰도 점수) · 산책 기록 ·
Gemini 민원 문안 프록시 · 역지오코딩.

## 실행

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # 키 입력 (없어도 폴백으로 전부 동작)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 영상 추론 `POST /infer/video`

웹이 산책 영상(mp4)을 업로드하면 **시각(t)별 탐지 타임라인**을 돌려준다.
`MODEL_PATH` 가 있으면 opencv 로 프레임을 샘플링해 실제 YOLO 추론, 없으면 업로드
영상 길이에 맞춘 **결정적(deterministic) 목 타임라인**을 반환한다(플로우 무중단).

```
form-data: video=<file>, duration=<sec>, conf=0.35, sample_fps=2.0
→ {"model":"loaded|absent","duration":float,
   "detections":[{"t":sec,"class_name":str,"confidence":float,"box":{...}}]}
```

## HTTPS (자체 서명)

```bash
sh scripts/gen-cert.sh                 # certs/{cert,key}.pem 생성
# 로컬 직접 구동:
uvicorn app.main:app --host 0.0.0.0 --port 8443 \
  --ssl-certfile certs/cert.pem --ssl-keyfile certs/key.pem
# 또는 Docker: 리포 루트에서 docker compose up --build  (https://localhost:8443)
```

`SSL_CERTFILE`·`SSL_KEYFILE` 를 둘 다 주면 `start.sh` 가 HTTPS 로, 없으면 HTTP 로 뜬다.

- Swagger: `http://localhost:8000/docs` · 명세: [`../docs/API.md`](../docs/API.md)
- DB: `pawpatrol.db` (SQLite, 자동 생성) · 업로드: `media/` (자동 생성)
- 데모장에서는 맥과 폰을 같은 와이파이에 두고 앱 `src/config.ts` 의 `API_URL` 을 맥 IP로.

## 환경변수 (.env)

| 키 | 없을 때 |
|----|---------|
| `GEMINI_API_KEY` | 민원 문안 템플릿 폴백 (`source: "template"`) |
| `GEMINI_MODEL` | 기본 `gemini-2.5-flash` |
| `KAKAO_REST_API_KEY` | 주소 대신 좌표 문자열 |
| `MODEL_PATH` | `/infer·/infer/video` 가 목 타임라인 반환 |
| `DATABASE_URL` | 로컬 SQLite (`pawpatrol.db`) |
| `SSL_CERTFILE`·`SSL_KEYFILE` | HTTP 로 기동 (상위 TLS 종료 가정) |
