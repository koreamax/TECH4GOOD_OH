# API 명세서

Base URL: `http://<서버IP>:8000` · 모든 응답 JSON · 인증 없음(해커톤 범위).
서버 실행 후 `http://<서버IP>:8000/docs` 에서 Swagger(자동 생성)로도 확인 가능.

## 공통

- 좌표는 WGS84 `lat`(위도), `lng`(경도), 소수점 6자리.
- 시각은 ISO 8601 (`2026-07-15T21:30:00`), 서버 로컬 기준.
- 이미지 업로드는 `multipart/form-data`, 응답의 이미지 경로는 `/media/...` (정적 서빙).
- 오류: `4xx/5xx` + `{"detail": "메시지"}`.

클래스 enum (모델과 동일):
`sidewalk_normal` `sidewalk_damaged` `braille_normal` `braille_damaged`

---

## 1. 탐지 (Detections)

### POST /detections — 탐지 이벤트 저장

산책 중 탐지가 발생하면 승인 여부와 무관하게 저장한다(임계값 미만·오탐 포함, 재학습 데이터).

요청 (multipart):

| 필드 | 타입 | 필수 | 설명 |
|------|------|:---:|------|
| image | file | O | 캡처 프레임 (jpeg) |
| class_name | str | O | 클래스 enum |
| confidence | float | O | 0~1 |
| lat, lng | float | O | 탐지 좌표 |
| walk_id | int | X | 진행 중 산책 ID |
| verified | str | X | `confirmed`(맞아요) / `rejected`(아니에요) / `pending`(기본) |

응답 200:

```json
{ "id": 12, "image_url": "/media/detections/12.jpg", "cluster_score": 60 }
```

### PATCH /detections/{id} — 사용자 검증 결과 갱신

요청: `{ "verified": "confirmed" | "rejected" }` → 응답: 갱신된 탐지 객체.

---

## 2. 민원 문안 생성 (Complaints)

### POST /complaints/generate — Gemini 민원 문안 생성

승인 시트를 열 때 호출. 캡처 이미지를 보고 `{제목, 내용}`을 생성한다.
GEMINI_API_KEY 미설정·호출 실패 시 템플릿 문안으로 폴백(플로우 무중단).

요청 (multipart):

| 필드 | 타입 | 필수 | 설명 |
|------|------|:---:|------|
| image | file | O | 캡처 프레임 |
| class_name | str | O | 클래스 enum |
| confidence | float | O | 0~1 |
| lat, lng | float | O | 좌표 (주소 역지오코딩에 사용) |
| detected_at | str | X | 탐지 시각 ISO 8601 |

응답 200:

```json
{
  "title": "OO로 보도블록 파손 신고",
  "content": "보도블록 여러 장이 깨져 단차가 발생해 있으며 ...",
  "address": "서울 마포구 OO로 12 인근",
  "source": "gemini"
}
```

`source`: `gemini` | `template` (폴백 여부 — 데모 중 상태 확인용).

---

## 3. 신고 (Reports)

### POST /reports — 승인 → 모의 접수

사용자가 [승인하고 신고]를 누르면 호출. 접수번호를 발급하고 해당 탐지를 `confirmed` 처리.

요청 (JSON):

```json
{ "detection_id": 12, "title": "...", "content": "...", "address": "..." }
```

응답 200:

```json
{ "id": 3, "receipt_no": "SPP-20260715-0003", "status": "접수완료", "created_at": "..." }
```

### GET /reports — 신고 목록 (`?walk_id=` 필터 가능)

응답: 신고 배열 (탐지 이미지·좌표 포함).

---

## 4. 산책 (Walks)

### POST /walks — 산책 세션 저장 (종료 시)

요청 (multipart):

| 필드 | 타입 | 필수 | 설명 |
|------|------|:---:|------|
| route_json | str | O | `[{"lat":..,"lng":..,"t":"ISO시각"}, ...]` 직렬화 문자열 |
| started_at, ended_at | str | O | ISO 8601 |
| distance_m | float | O | 미터 |
| duration_s | int | O | 초 |
| detection_ids | str | X | 이 산책의 탐지 ID들 `"1,2,3"` |
| dog_photo | file | X | 강아지 사진 (요약 화면에서 첨부) |
| user_name | str | X | 표시 이름 (기본 "익명의 순찰대원") |

응답 200: 산책 객체 (`id`, 통계, `report_count`, `detection_count` 포함).

### GET /walks — 산책 목록 (최신순, `?limit=`)

### GET /walks/{id} — 산책 상세

응답: 경로·통계 + `detections[]` + `reports[]` + 사진 경로들.

---

## 5. 지도 (Map)

### GET /map/markers — 위험 마커 (클러스터·신뢰도 점수 포함)

쿼리: `lat, lng, radius_m` (선택 — 없으면 전체).

응답 200:

```json
[
  {
    "cluster_id": "c-7", "lat": 37.55, "lng": 126.93,
    "class_name": "sidewalk_damaged", "score": 80, "level": "orange",
    "detection_count": 3, "confirmed_count": 2,
    "last_seen": "2026-07-15T21:00:00", "image_url": "/media/detections/12.jpg"
  }
]
```

`level`: `gray`(<30) `yellow`(30~59) `orange`(60~89) `red`(90+) — 점수 규칙은 ARCHITECTURE.md.

---

## 6. 피드 (Feed)

### GET /feed — 산책 카드 목록 (최신순, `?limit=`)

응답 200:

```json
[
  {
    "walk_id": 5, "user_name": "익명의 순찰대원",
    "date": "2026-07-15", "distance_m": 1820, "duration_s": 2100,
    "dog_photo_url": "/media/walks/5_dog.jpg",
    "route_preview": [{"lat":..,"lng":..}],
    "report_count": 2, "badge": "파손 발견 2건"
  }
]
```

---

## 7. 서버 추론 (Infer)

### POST /infer — 프레임 YOLO 탐지 (웹 데모의 추론 경로)

요청 (multipart): `image` (jpeg 프레임), 쿼리 `conf` (기본 0.35).

응답 200 (모델 로드됨):

```json
{
  "model": "loaded",
  "detections": [
    { "class_name": "sidewalk_damaged", "confidence": 0.81,
      "box": { "x1": 0.31, "y1": 0.55, "x2": 0.62, "y2": 0.9 } }
  ]
}
```

`box` 는 0~1 정규화 xyxy. 서버 env `MODEL_PATH` 미설정·ultralytics 미설치면
`{"model": "absent", "reason": "...", "detections": []}` — 프론트는 목 탐지 모드로 동작.

### POST /infer/video — 영상 업로드 → 시각별 탐지 타임라인 (웹 데모 주력 경로)

요청 (multipart): `video`(mp4), `duration`(초, 목 타임라인용), `conf`(0.35), `sample_fps`(2.0).

응답 200:

```json
{
  "model": "absent",
  "duration": 14.0,
  "detections": [
    { "t": 4.0, "class_name": "sidewalk_damaged", "confidence": 0.68,
      "box": { "x1": 0.53, "y1": 0.49, "x2": 0.77, "y2": 0.69 } }
  ]
}
```

`t` 는 영상 내 시각(초). `MODEL_PATH` 있으면 opencv 프레임 샘플링 + 실제 YOLO(`model:"loaded"`),
없으면 `duration` 기반 결정적 목 타임라인(`model:"absent"`). 프론트는 영상 재생 시각에
맞춰 이 타임라인을 "실시간 탐지처럼" 트리거한다.

---

## 8. 기타

- `GET /health` — `{"status":"ok"}` (시연망 점검용)
- `GET /geocode/reverse?lat=&lng=` — 주소 문자열. Naver(NCP) 키 미설정 시 좌표 문자열 폴백.
- `GET /media/...` — 업로드 이미지 정적 서빙
