// ===== 데모 전 확인할 설정 (.env 로 주입) =====

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// true = 서버 YOLO 추론(/infer), false = 목 탐지 모드 (모델 없이 전체 플로우 동작)
export const USE_SERVER_INFER: boolean =
  (import.meta.env.VITE_USE_SERVER_INFER ?? 'false') === 'true';

// 서버 추론 시 프레임 전송 주기
export const INFER_INTERVAL_MS = 1500;

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
