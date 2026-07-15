// ===== 데모 전 반드시 확인할 설정 =====

// 서버 주소: 데모장에서 맥과 폰을 같은 와이파이에 두고 맥 IP로 변경할 것
export const API_URL = 'http://192.168.0.10:8000';

// 온디바이스 TFLite 추론 사용 여부.
// 모델(app/assets/models/model.tflite) 탑재 전에는 false = 목 탐지 모드.
export const USE_TFLITE = false;

// 선(先) 승인 게이트: 이 값 이상일 때만 알람. 미만은 알람 없이 서버에만 축적.
export const ALERT_CONFIDENCE_THRESHOLD = 0.6;

// ===== 모델 관련 (ml/README.md 와 반드시 일치) =====

export const MODEL_INPUT_SIZE = 640;

export const CLASSES = [
  'sidewalk_normal',
  'sidewalk_damaged',
  'braille_normal',
  'braille_damaged',
] as const;

export type ClassName = (typeof CLASSES)[number];

// 알람 대상 = damaged 클래스만
export const DAMAGED_CLASS_IDS = [1, 3];

export const CLASS_KR: Record<string, string> = {
  sidewalk_normal: '정상 보도',
  sidewalk_damaged: '보도 파손',
  braille_normal: '정상 점자블록',
  braille_damaged: '점자블록 파손',
};

// ===== 데모 프로필 =====

export const DOG_NAME = '콩이';
export const USER_NAME = '콩이 보호자';
