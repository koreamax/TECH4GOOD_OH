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

// 석촌호수 동호 한 바퀴 (lat, lng)
export const DEMO_ROUTE: [number, number][] = [
  [37.51065, 127.09835], [37.51078, 127.099], [37.51086, 127.09968],
  [37.5109, 127.1004], [37.51088, 127.10112], [37.5108, 127.10184],
  [37.51066, 127.10252], [37.51046, 127.10314], [37.5102, 127.10368],
  [37.50988, 127.10412], [37.50952, 127.10444], [37.50912, 127.10462],
  [37.5087, 127.10464], [37.5083, 127.1045], [37.50796, 127.1042],
  [37.5077, 127.10378], [37.50754, 127.10328], [37.50748, 127.10272],
  [37.50752, 127.10214], [37.50766, 127.10158], [37.5079, 127.10108],
  [37.50822, 127.10066], [37.5086, 127.10036], [37.50902, 127.1002],
];
