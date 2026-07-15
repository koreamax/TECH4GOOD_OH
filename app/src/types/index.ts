export interface RoutePoint {
  lat: number;
  lng: number;
  t: string; // ISO 8601
}

/** 산책 세션 중 앱이 들고 있는 탐지 이벤트 */
export interface SessionDetection {
  serverId: number | null;
  className: string;
  confidence: number;
  lat: number;
  lng: number;
  imageUri: string;
  status: 'pending' | 'reported' | 'rejected';
  receiptNo?: string;
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
