export interface RoutePoint {
  lat: number;
  lng: number;
  t: string;
}

/** 산책 세션 중 프론트가 들고 있는 탐지 이벤트 */
export interface SessionDetection {
  serverId: number | null;
  className: string;
  confidence: number;
  lat: number;
  lng: number;
  imageUrl: string; // object URL (승인 화면 표시용)
  imageBlob: Blob | null;
  status: 'pending' | 'reported' | 'rejected';
  receiptNo?: string;
  at: string; // 탐지 시각 ISO (산책 종료 화면 타임라인용)
}

export interface ComplaintDraft {
  title: string;
  content: string;
  address: string;
  source: 'gemini' | 'template';
}

// ===== 서버 응답 타입 (docs/API.md) =====

export interface Walk {
  id: number;
  started_at: string;
  ended_at: string;
  distance_m: number;
  duration_s: number;
  route: RoutePoint[];
  dog_photo_url: string | null;
  user_name: string;
  detection_count: number;
  report_count: number;
}

export interface WalkDetail extends Walk {
  detections: ServerDetection[];
  reports: Report[];
}

export interface ServerDetection {
  id: number;
  walk_id: number | null;
  class_name: string;
  confidence: number;
  lat: number;
  lng: number;
  image_url: string | null;
  verified: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
}

export interface Report {
  id: number;
  detection_id: number;
  title: string;
  content: string;
  address: string;
  receipt_no: string;
  status: string;
  created_at: string;
  detection?: ServerDetection | null;
}

export interface MapMarkerData {
  cluster_id: string;
  lat: number;
  lng: number;
  class_name: string;
  score: number;
  level: 'gray' | 'yellow' | 'orange' | 'red';
  detection_count: number;
  confirmed_count: number;
  last_seen: string;
  image_url: string | null;
}

export interface InferResult {
  model: 'loaded' | 'absent';
  reason?: string;
  detections: {
    class_name: string;
    confidence: number;
    box: { x1: number; y1: number; x2: number; y2: number };
  }[];
}

/** 영상 업로드 추론 결과 — 시각(t)별 탐지 타임라인 */
export interface VideoTimelineItem {
  t: number; // 영상 내 시각(초)
  class_name: string;
  confidence: number;
  box: { x1: number; y1: number; x2: number; y2: number };
}

export interface VideoInferResult {
  model: 'loaded' | 'absent';
  reason?: string;
  duration: number;
  detections: VideoTimelineItem[];
}
