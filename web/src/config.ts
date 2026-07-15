// ===== 데모 전 확인할 설정 (.env 로 주입) =====

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// true = 서버 YOLO 추론(/infer), false = 목 탐지 모드 (모델 없이 전체 플로우 동작)
export const USE_SERVER_INFER: boolean =
  (import.meta.env.VITE_USE_SERVER_INFER ?? 'false') === 'true';

// 서버 추론 시 프레임 전송 주기
export const INFER_INTERVAL_MS = 1500;

// 산책 화면에 재생할 데모 영상 (public/ 하위). 실제 촬영본으로 교체 가능.
export const DEMO_VIDEO: string = import.meta.env.VITE_DEMO_VIDEO ?? '/demo-walk.mp4';

// ===== 데모 연출: 영상 세트 =====
// 플로우: 평시1 → [정지·인식1] → 평시2 → [정지·인식2] → 평시3
// 평시(일반 걷기) 영상 3개 — 걷기 세그먼트(정지 전·사이·후)에 순서대로 재생(루프).
export const DEMO_NORMAL_VIDEOS: string[] = [
  import.meta.env.VITE_DEMO_NORMAL1 ?? '/demo-normal1.mp4', // 평시1 (3.38.29)
  import.meta.env.VITE_DEMO_NORMAL2 ?? '/demo-normal2.mp4', // 평시2 (04-29-39)
  import.meta.env.VITE_DEMO_NORMAL3 ?? '/demo-normal3.mp4', // 평시3 (04-30-29)
];

// 정지점에서 재생할 '인식·신고 영상' 2개. 각 정지점과 1:1. 서버 실추론으로 박스·알람 발생.
export const DEMO_DETECT_VIDEOS: string[] = [
  import.meta.env.VITE_DEMO_DETECT1 ?? '/demo-walk.mp4', // 인식1 (02-04-11) 피크 0.79
  import.meta.env.VITE_DEMO_DETECT2 ?? '/demo-detect2.mp4', // 인식2 (02-04-43) 피크 0.60
];

// DEMO_ROUTE 상에서 핀이 멈추는 지점 인덱스. DEMO_DETECT_VIDEOS 와 같은 순서·개수.
// index 4 ≈ 진행률 20%, index 16 ≈ 71%. 데모 페이싱·지도 위치에 맞춰 조정 가능.
export const DEMO_STOP_INDICES: number[] = [4, 16];

// Naver 지도 Client ID (NCP). 없으면 지도 자리에 폴백 UI 표시.
export const NAVER_MAP_CLIENT_ID: string = import.meta.env.VITE_NAVER_MAP_CLIENT_ID ?? '';

// 선(先) 승인 게이트: 이 값 이상일 때만 알람. 미만은 알람 없이 서버에만 축적.
export const ALERT_CONFIDENCE_THRESHOLD = 0.6;

// 알람 연타 방지
export const DETECTION_COOLDOWN_MS = 15_000;

// ===== 클래스 (ml/README.md 와 일치) =====

export const DAMAGED_CLASSES = ['sidewalk_damaged', 'braille_damaged'];

export const CLASS_KR: Record<string, string> = {
  sidewalk_normal: '정상 보도',
  sidewalk_damaged: '보도 파손',
  braille_normal: '정상 점자블록',
  braille_damaged: '점자블록 파손',
};

// ===== 데모 프로필 =====

export const DOG_NAME = '콩이';
export const USER_NAME = '콩이 보호자';

// ===== 모의 GPS (데모: 실제 위치 대신 사전 정의 경로를 따라 이동) =====

export const USE_DEMO_GPS: boolean = (import.meta.env.VITE_DEMO_GPS ?? 'true') === 'true';
export const DEMO_GPS_STEP_MS = 2800; // 천천히 걷기 (사용자 요청)

// 석촌호수 한 바퀴 (lat, lng). OSM 석촌호수 물 경계(relation 9856886)를 12m 바깥으로
// 오프셋해 산책로를 따라가도록 생성 — 물 위를 가로지르지 않는다. (자동 생성, 시각 확인 권장)
export const DEMO_ROUTE: [number, number][] = [
  [37.50974, 127.10461], [37.51193, 127.10726], [37.51264, 127.10744],
  [37.51306, 127.10717], [37.5131, 127.10704], [37.51288, 127.10638],
  [37.51175, 127.10432], [37.51149, 127.10336], [37.51122, 127.10303],
  [37.51091, 127.103], [37.51029, 127.10342], [37.50968, 127.10254],
  [37.51029, 127.10171], [37.50992, 127.10029], [37.5096, 127.09943],
  [37.5093, 127.09889], [37.50855, 127.09795], [37.50731, 127.09789],
  [37.5073, 127.09805], [37.50721, 127.09815], [37.50712, 127.09816],
  [37.50703, 127.09883], [37.50708, 127.09929], [37.50752, 127.10069],
  [37.50816, 127.10207], [37.50876, 127.10287], [37.50912, 127.1029],
  [37.50956, 127.10274], [37.51007, 127.10366], [37.50963, 127.10417],
];
