import { create } from 'zustand';

import type { RoutePoint, SessionDetection } from '../types';
import { haversineM } from '../utils/geo';

interface WalkState {
  status: 'idle' | 'walking' | 'ended';
  startedAt: string | null;
  endedAt: string | null;
  route: RoutePoint[];
  distanceM: number;
  detections: SessionDetection[];
  /** 임계값 이상이라 사용자 확인을 기다리는 탐지 (선 승인 게이트) */
  pendingAlertIndex: number | null;

  startWalk: () => void;
  addRoutePoint: (lat: number, lng: number) => void;
  addDetection: (det: SessionDetection, alert: boolean) => void;
  updateDetection: (index: number, patch: Partial<SessionDetection>) => void;
  clearAlert: () => void;
  endWalk: () => void;
  reset: () => void;
}

export const useWalkStore = create<WalkState>((set, get) => ({
  status: 'idle',
  startedAt: null,
  endedAt: null,
  route: [],
  distanceM: 0,
  detections: [],
  pendingAlertIndex: null,

  startWalk: () =>
    set({
      status: 'walking',
      startedAt: new Date().toISOString(),
      endedAt: null,
      route: [],
      distanceM: 0,
      detections: [],
      pendingAlertIndex: null,
    }),

  addRoutePoint: (lat, lng) => {
    const { route, distanceM } = get();
    const point: RoutePoint = { lat, lng, t: new Date().toISOString() };
    let added = 0;
    if (route.length > 0) {
      const last = route[route.length - 1];
      added = haversineM(last.lat, last.lng, lat, lng);
      // GPS 노이즈로 인한 순간이동(>100m)은 거리 누적에서 제외
      if (added > 100) added = 0;
    }
    set({ route: [...route, point], distanceM: distanceM + added });
  },

  addDetection: (det, alert) => {
    const detections = [...get().detections, det];
    set({
      detections,
      pendingAlertIndex: alert ? detections.length - 1 : get().pendingAlertIndex,
    });
  },

  updateDetection: (index, patch) => {
    const detections = get().detections.map((d, i) => (i === index ? { ...d, ...patch } : d));
    set({ detections });
  },

  clearAlert: () => set({ pendingAlertIndex: null }),

  endWalk: () => set({ status: 'ended', endedAt: new Date().toISOString() }),

  reset: () =>
    set({
      status: 'idle',
      startedAt: null,
      endedAt: null,
      route: [],
      distanceM: 0,
      detections: [],
      pendingAlertIndex: null,
    }),
}));
