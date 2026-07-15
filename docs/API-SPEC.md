# Paw Patrol Network — API 명세서

> FastAPI 소스(`server/app`) 기준 자동 정리 · v0.1.0
> 생성일 2026-07-16 · 대상 커밋 `main@30ff3c7`

## 개요

| 항목 | 값 |
|---|---|
| 프레임워크 | FastAPI 0.115+ (`server/app/main.py`) |
| Base URL (로컬 Docker) | `https://localhost:8443` (host 8443 → container 8000, 자체서명 HTTPS) |
| Base URL (TLS 종료 위임 시) | `http://<host>:8000` (인증서 없으면 HTTP 기동) |
| CORS | 모든 origin/method/header 허용 (`allow_origins=["*"]`) |
| 정적 파일 | `/media/*` — 업로드 이미지/사진 서빙 |
| 인증 | 없음 (데모) |
| 폴백 정책 | DB 없으면 SQLite · 모델 없으면 mock 추론 · Gemini 키 없으면 템플릿 문안 · Kakao 키 없으면 좌표 문자열 |

요청 본문 형식은 엔드포인트마다 다릅니다: 파일 업로드가 있는 것은 **`multipart/form-data`**, 그 외는 **`application/json`**. 아래 각 항목에 표기했습니다.

---

## 1. 시스템

### `GET /health`
헬스체크.
```json
{ "status": "ok" }
```

### `GET /geocode/reverse`
좌표 → 주소 역지오코딩 (Kakao REST, 키 없으면 좌표 문자열 폴백).

| 쿼리 | 타입 | 필수 |
|---|---|---|
| `lat` | float | ✔ |
| `lng` | float | ✔ |

```json
{ "address": "서울 송파구 ..." }
```

---

## 2. 산책 (Walks) — `/walks`

### `POST /walks` · `multipart/form-data`
산책 기록 생성. 산책 중 저장해둔 탐지들을 이 산책에 연결한다.

| 필드 | 타입 | 필수 | 기본 | 설명 |
|---|---|---|---|---|
| `route_json` | string(JSON) | ✔ | | 경로 좌표 배열 JSON 문자열 |
| `started_at` | string | ✔ | | ISO 시각 |
| `ended_at` | string | ✔ | | ISO 시각 |
| `distance_m` | float | ✔ | | 이동 거리(m) |
| `duration_s` | int | ✔ | | 소요 시간(초) |
| `detection_ids` | string | ✖ | `""` | 연결할 탐지 id CSV (예: `"3,5,8"`) |
| `user_name` | string | ✖ | `"익명의 순찰대원"` | |
| `dog_photo` | file | ✖ | | 강아지 사진 |

**응답** → [Walk 객체](#walk-객체)

### `GET /walks`
최근 산책 목록 (id 내림차순).

| 쿼리 | 타입 | 기본 |
|---|---|---|
| `limit` | int | 20 |

**응답** → `[Walk]`

### `GET /walks/{walk_id}`
산책 상세 + 연결된 탐지·신고 포함.

**응답** → [Walk 객체](#walk-객체) + 추가 필드:
```jsonc
{
  ...walk,
  "detections": [ /* Detection[] */ ],
  "reports":    [ /* Report[] */ ]
}
```
404: 산책 기록 없음.

---

## 3. 탐지 (Detections) — `/detections`

`verified` 상태값: `pending`(미검증) · `confirmed`(맞아요) · `rejected`(오탐/재학습 대상).

### `POST /detections` · `multipart/form-data`
파손 탐지 저장.

| 필드 | 타입 | 필수 | 기본 |
|---|---|---|---|
| `image` | file | ✔ | |
| `class_name` | string | ✔ | |
| `confidence` | float | ✔ | |
| `lat` | float | ✔ | |
| `lng` | float | ✔ | |
| `walk_id` | int | ✖ | null |
| `verified` | string | ✖ | `pending` |

**응답**
```json
{ "id": 12, "image_url": "/media/detections/12.jpg", "cluster_score": 60 }
```
`cluster_score`: 해당 지점 클러스터 신뢰도 점수(0~100). 400: `verified` 값 오류.

### `PATCH /detections/{detection_id}` · `application/json`
탐지 검증 상태 변경.
```json
{ "verified": "confirmed" }
```
**응답** → [Detection 객체](#detection-객체). 400: 값 오류 · 404: 탐지 없음.

---

## 4. 신고 (Reports) — `/reports`

### `POST /reports` · `application/json`
민원 신고 접수 (해당 탐지를 `confirmed`로 변경, 모의 접수번호 발급 — 실접수 아님).
```json
{ "detection_id": 12, "title": "...", "content": "...", "address": "" }
```
`address`는 선택(기본 `""`).

**응답** → [Report 객체](#report-객체) (`receipt_no` 형식 `SPP-YYYYMMDD-0001`). 404: 탐지 없음.

### `GET /reports`
신고 목록 (id 내림차순), 각 항목에 원본 탐지 포함.

| 쿼리 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `walk_id` | int | ✖ | 지정 시 해당 산책의 탐지에 대한 신고만 필터 |

**응답**
```jsonc
[ { ...report, "detection": { /* Detection | null */ } } ]
```

---

## 5. 민원 문안 생성 (Complaints) — `/complaints`

### `POST /complaints/generate` · `multipart/form-data`
이미지+메타로 민원 제목/본문 생성 (Gemini, 키 없으면 템플릿 폴백). **저장하지 않음** — 문안만 반환.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `image` | file | ✔ | |
| `class_name` | string | ✔ | |
| `confidence` | float | ✔ | |
| `lat` | float | ✔ | |
| `lng` | float | ✔ | |
| `detected_at` | string | ✖ | 없으면 현재 시각 |

**응답**
```json
{ "title": "...", "content": "...", "address": "서울 ...", "source": "gemini" }
```
`source`: `"gemini"` 또는 `"template"`.

---

## 6. 지도 마커 (Map) — `/map`

### `GET /map/markers`
파손 지점 클러스터 마커. 같은 클래스·반경 30m 탐지를 묶어 점수화.

| 쿼리 | 타입 | 기본 | 설명 |
|---|---|---|---|
| `lat` | float | null | 지정 시 중심 |
| `lng` | float | null | 지정 시 중심 |
| `radius_m` | float | 3000 | lat/lng 지정 시 반경 필터 |

**응답** → `[Marker]` ([Marker 객체](#marker-객체))
점수 규칙: AI 발견 +30 / 사용자 승인 +30 / 다른 산책 재탐지 +20(개당) / 같은 산책 반복 +10(개당), 상한 100.
색상 레벨: `<30 gray` · `30~59 yellow` · `60~89 orange` · `90+ red`. `rejected` 탐지는 제외.

---

## 7. 커뮤니티 피드 (Feed) — `/feed`

> 현재 앱 IA에는 피드 화면이 없음 — 서버만 유지(확장 대비).

### `GET /feed`

| 쿼리 | 타입 | 기본 |
|---|---|---|
| `limit` | int | 20 |

**응답**
```jsonc
[ {
  "walk_id": 3, "user_name": "...", "date": "2026-07-16",
  "distance_m": 1240.0, "duration_s": 1800,
  "dog_photo_url": "/media/walks/3_dog.jpg",
  "route_preview": [ { "lat": 0.0, "lng": 0.0 } ],   // 최대 20점 다운샘플
  "report_count": 2,
  "badge": "파손 발견 2건"                             // 없으면 "순찰 완료"
} ]
```

---

## 8. AI 추론 (Infer) — `/infer`

`MODEL_PATH` 미설정·`ultralytics` 미설치면 **mock** 결과를 반환하고, 프론트는 동일 파이프라인으로 동작(플로우 무중단). 클래스명은 `sidewalk_damaged` / `braille_damaged`로 정규화.

### `POST /infer` · `multipart/form-data`
단일 프레임(JPEG) 추론 (레거시).

| 필드 | 타입 | 필수 | 기본 | 위치 |
|---|---|---|---|---|
| `image` | file | ✔ | | form |
| `conf` | float | ✖ | 0.35 | query |

**응답 (모델 있음)**
```json
{ "model": "loaded",
  "detections": [ { "class_name": "sidewalk_damaged", "confidence": 0.78,
                    "box": { "x1": 0.26, "y1": 0.29, "x2": 0.88, "y2": 0.52 } } ] }
```
**응답 (모델 없음)**
```json
{ "model": "absent", "reason": "MODEL_PATH 미설정", "detections": [] }
```
`box` 좌표는 0~1 정규화.

### `POST /infer/video` · `multipart/form-data`
영상 업로드 → 시각(t)별 탐지 타임라인 (웹 데모 주력 경로).

| 필드 | 타입 | 필수 | 기본 | 설명 |
|---|---|---|---|---|
| `video` | file | ✔ | | |
| `duration` | float | ✖ | 0.0 | 프론트가 아는 영상 길이(초) — mock 타임라인용 |
| `conf` | float | ✖ | 0.35 | |
| `sample_fps` | float | ✖ | 2.0 | 초당 샘플 프레임 수 |

**응답**
```jsonc
{
  "model": "loaded",              // 또는 "absent" (+ "reason")
  "duration": 15.0,
  "detections": [                 // 알람(쿨다운 15s 창별 피크)
    { "t": 4.0, "class_name": "sidewalk_damaged", "confidence": 0.78,
      "box": { "x1": 0.26, "y1": 0.29, "x2": 0.88, "y2": 0.52 } }
  ],
  "overlay": [                    // 실시간 오버레이(샘플 프레임마다, mask 포함 가능)
    { "t": 4.0, "class_name": "sidewalk_damaged", "confidence": 0.78,
      "box": { "x1": 0.26, "y1": 0.29, "x2": 0.88, "y2": 0.52 },
      "mask": [ [0.29, 0.31], [0.34, 0.31] /* 정규화 폴리곤, 최대 60점 */ ] }
  ]
}
```
모델 부재 시 `overlay`는 `detections`와 동일(목 박스, mask 없음).

---

## 데이터 모델

### Walk 객체
```jsonc
{
  "id": 3,
  "started_at": "2026-07-16T09:00:00",
  "ended_at": "2026-07-16T09:30:00",
  "distance_m": 1240.0,
  "duration_s": 1800,
  "route": [ /* route_json 파싱 결과 */ ],
  "dog_photo_url": "/media/walks/3_dog.jpg",   // 없으면 null
  "user_name": "익명의 순찰대원",
  "detection_count": 2,
  "report_count": 1
}
```

### Detection 객체
```jsonc
{
  "id": 12,
  "walk_id": 3,                 // null 가능
  "class_name": "sidewalk_damaged",
  "confidence": 0.78,
  "lat": 37.5, "lng": 127.1,
  "image_url": "/media/detections/12.jpg",   // 없으면 null
  "verified": "pending",        // pending | confirmed | rejected
  "created_at": "2026-07-16T09:12:00"
}
```

### Report 객체
```jsonc
{
  "id": 5,
  "detection_id": 12,
  "title": "...",
  "content": "...",
  "address": "서울 송파구 ...",
  "receipt_no": "SPP-20260716-0005",
  "status": "접수완료",
  "created_at": "2026-07-16T09:15:00"
}
```

### Marker 객체
```jsonc
{
  "lat": 37.5, "lng": 127.1,          // 클러스터 중심(평균)
  "class_name": "sidewalk_damaged",
  "score": 60,                        // 0~100
  "level": "orange",                  // gray | yellow | orange | red
  "detection_count": 3,
  "confirmed_count": 1,
  "last_seen": "2026-07-16T09:12:00",
  "image_url": "/media/detections/12.jpg"
}
```

---

## 엔드포인트 요약

| Method | Path | 본문 | 용도 |
|---|---|---|---|
| GET | `/health` | — | 헬스체크 |
| GET | `/geocode/reverse` | — | 역지오코딩 |
| POST | `/walks` | multipart | 산책 생성 |
| GET | `/walks` | — | 산책 목록 |
| GET | `/walks/{id}` | — | 산책 상세 |
| POST | `/detections` | multipart | 탐지 저장 |
| PATCH | `/detections/{id}` | json | 탐지 검증 상태 변경 |
| POST | `/reports` | json | 신고 접수 |
| GET | `/reports` | — | 신고 목록 |
| POST | `/complaints/generate` | multipart | 민원 문안 생성 |
| GET | `/map/markers` | — | 지도 마커 |
| GET | `/feed` | — | 커뮤니티 피드 |
| POST | `/infer` | multipart | 단일 프레임 추론 |
| POST | `/infer/video` | multipart | 영상 타임라인 추론 |
| GET | `/media/*` | — | 정적 파일 |

> FastAPI 대화형 문서도 기동 시 자동 제공: `/docs` (Swagger UI) · `/redoc` · `/openapi.json`
