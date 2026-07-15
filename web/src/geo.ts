import type { RoutePoint } from './types';

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dp = toRad(lat2 - lat1);
  const dl = toRad(lng2 - lng1);
  const a =
    Math.sin(dp / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)}km`;
  return `${Math.round(m)}m`;
}

export function formatDuration(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  if (mm >= 60) return `${Math.floor(mm / 60)}시간 ${mm % 60}분`;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

export function formatDurationKr(s: number): string {
  const mm = Math.max(1, Math.round(s / 60));
  if (mm >= 60) return `${Math.floor(mm / 60)}시간 ${mm % 60}분`;
  return `${mm}분`;
}

export function todayKr(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 경로 전체가 보이는 leaflet bounds */
export function routeBounds(points: RoutePoint[]): [[number, number], [number, number]] {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

export const SEOUL: [number, number] = [37.5665, 126.978];
