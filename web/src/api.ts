import { API_URL } from './config';
import type {
  ComplaintDraft,
  InferResult,
  MapMarkerData,
  Report,
  RoutePoint,
  Walk,
  WalkDetail,
} from './types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export function mediaUrl(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

// ===== 서버 추론 =====

export async function inferFrame(imageBlob: Blob): Promise<InferResult> {
  const form = new FormData();
  form.append('image', imageBlob, 'frame.jpg');
  return json(await fetch(`${API_URL}/infer`, { method: 'POST', body: form }));
}

// ===== 탐지 =====

export async function postDetection(params: {
  imageBlob: Blob;
  className: string;
  confidence: number;
  lat: number;
  lng: number;
}): Promise<{ id: number; image_url: string; cluster_score: number }> {
  const form = new FormData();
  form.append('image', params.imageBlob, 'frame.jpg');
  form.append('class_name', params.className);
  form.append('confidence', String(params.confidence));
  form.append('lat', String(params.lat));
  form.append('lng', String(params.lng));
  return json(await fetch(`${API_URL}/detections`, { method: 'POST', body: form }));
}

export async function patchDetection(
  id: number,
  verified: 'confirmed' | 'rejected',
): Promise<void> {
  await json(
    await fetch(`${API_URL}/detections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified }),
    }),
  );
}

// ===== 민원 문안 =====

export async function generateComplaint(params: {
  imageBlob: Blob;
  className: string;
  confidence: number;
  lat: number;
  lng: number;
}): Promise<ComplaintDraft> {
  const form = new FormData();
  form.append('image', params.imageBlob, 'frame.jpg');
  form.append('class_name', params.className);
  form.append('confidence', String(params.confidence));
  form.append('lat', String(params.lat));
  form.append('lng', String(params.lng));
  form.append('detected_at', new Date().toISOString());
  return json(await fetch(`${API_URL}/complaints/generate`, { method: 'POST', body: form }));
}

// ===== 신고 =====

export async function postReport(params: {
  detectionId: number;
  title: string;
  content: string;
  address: string;
}): Promise<Report> {
  return json(
    await fetch(`${API_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detection_id: params.detectionId,
        title: params.title,
        content: params.content,
        address: params.address,
      }),
    }),
  );
}

export async function getReports(): Promise<Report[]> {
  return json(await fetch(`${API_URL}/reports`));
}

// ===== 산책 =====

export async function postWalk(params: {
  route: RoutePoint[];
  startedAt: string;
  endedAt: string;
  distanceM: number;
  durationS: number;
  detectionIds: number[];
  userName: string;
  dogPhoto?: File | null;
}): Promise<Walk> {
  const form = new FormData();
  form.append('route_json', JSON.stringify(params.route));
  form.append('started_at', params.startedAt);
  form.append('ended_at', params.endedAt);
  form.append('distance_m', String(params.distanceM));
  form.append('duration_s', String(params.durationS));
  form.append('detection_ids', params.detectionIds.join(','));
  form.append('user_name', params.userName);
  if (params.dogPhoto) form.append('dog_photo', params.dogPhoto, 'dog.jpg');
  return json(await fetch(`${API_URL}/walks`, { method: 'POST', body: form }));
}

export async function getWalks(limit = 20): Promise<Walk[]> {
  return json(await fetch(`${API_URL}/walks?limit=${limit}`));
}

export async function getWalk(id: number): Promise<WalkDetail> {
  return json(await fetch(`${API_URL}/walks/${id}`));
}

// ===== 지도 =====

export async function getMarkers(): Promise<MapMarkerData[]> {
  return json(await fetch(`${API_URL}/map/markers`));
}
