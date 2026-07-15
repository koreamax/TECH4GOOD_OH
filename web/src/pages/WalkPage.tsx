import L from 'leaflet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';

import { inferFrame, postDetection } from '../api';
import DetectionModal from '../components/DetectionModal';
import SegmentPill from '../components/SegmentPill';
import {
  ALERT_CONFIDENCE_THRESHOLD,
  CLASS_KR,
  DAMAGED_CLASSES,
  DETECTION_COOLDOWN_MS,
  INFER_INTERVAL_MS,
  USE_SERVER_INFER,
} from '../config';
import { MockDetector } from '../detection/mock';
import { formatDistance, formatDuration, SEOUL } from '../geo';
import { useWalkStore } from '../store';

const PRIMARY = '#5fc98e';

const dogIcon = L.divIcon({
  className: '',
  html: `<div style="width:44px;height:44px;border-radius:50%;background:${PRIMARY};border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 12px rgba(0,0,0,.2)">🐶</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const warnIcon = L.divIcon({
  className: '',
  html: '<div style="font-size:24px">⚠️</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function Recenter({ point }: { point: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView(point, map.getZoom());
  }, [map, point]);
  return null;
}

/** 산책 화면 (S-10) — 시작 모달 → 지도 뷰/카메라 뷰 토글 + 탐지 알림 */
export default function WalkPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [intro, setIntro] = useState(true);
  const [view, setView] = useState(0); // 0 지도 뷰, 1 카메라 뷰
  const [elapsedS, setElapsedS] = useState(0);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState(false);

  const status = useWalkStore((s) => s.status);
  const route = useWalkStore((s) => s.route);
  const distanceM = useWalkStore((s) => s.distanceM);
  const detections = useWalkStore((s) => s.detections);
  const pendingAlertIndex = useWalkStore((s) => s.pendingAlertIndex);

  const watchId = useRef<number | null>(null);
  const mock = useRef(new MockDetector());
  const inferTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLoc = useRef<{ lat: number; lng: number } | null>(null);
  const lastDetectionAt = useRef(0);
  const busy = useRef(false);

  // 카메라 (HTTPS 또는 localhost 필수)
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      })
      .catch(() => setCameraError(true));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 타이머
  useEffect(() => {
    if (status !== 'walking') return;
    const startedAt = useWalkStore.getState().startedAt;
    const id = setInterval(() => {
      if (startedAt) setElapsedS(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  const captureFrame = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return resolve(null);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8);
    });
  }, []);

  // 탐지 이벤트 공통 처리 (목/서버 추론 동일 경로): 캡처 → 서버 저장 → 임계값 게이트
  const handleDetection = useCallback(
    async (e: { className: string; confidence: number }) => {
      const now = Date.now();
      if (busy.current || now - lastDetectionAt.current < DETECTION_COOLDOWN_MS) return;
      busy.current = true;
      lastDetectionAt.current = now;
      try {
        const loc = lastLoc.current ?? { lat: SEOUL[0], lng: SEOUL[1] };
        const blob = await captureFrame();
        let serverId: number | null = null;
        if (blob) {
          try {
            const res = await postDetection({
              imageBlob: blob,
              className: e.className,
              confidence: e.confidence,
              lat: loc.lat,
              lng: loc.lng,
            });
            serverId = res.id;
          } catch {
            // 서버 불가 시에도 로컬 세션에는 남긴다
          }
        }
        const alert = e.confidence >= ALERT_CONFIDENCE_THRESHOLD;
        useWalkStore.getState().addDetection(
          {
            serverId,
            className: e.className,
            confidence: e.confidence,
            lat: loc.lat,
            lng: loc.lng,
            imageUrl: blob ? URL.createObjectURL(blob) : '',
            imageBlob: blob,
            status: 'pending',
          },
          alert, // 임계값 미만이면 알람 없이 조용히 축적 (선 승인 게이트)
        );
        if (alert) navigator.vibrate?.(300);
      } finally {
        busy.current = false;
      }
    },
    [captureFrame],
  );

  const startSession = () => {
    setIntro(false);
    useWalkStore.getState().startWalk();

    const onPos = (p: GeolocationPosition) => {
      lastLoc.current = { lat: p.coords.latitude, lng: p.coords.longitude };
      useWalkStore.getState().addRoutePoint(p.coords.latitude, p.coords.longitude);
    };
    navigator.geolocation?.getCurrentPosition(onPos, () => undefined, { enableHighAccuracy: true });
    watchId.current =
      navigator.geolocation?.watchPosition(onPos, () => undefined, {
        enableHighAccuracy: true,
      }) ?? null;

    if (USE_SERVER_INFER) {
      // 서버 YOLO 추론: 주기적으로 프레임 전송
      inferTimer.current = setInterval(async () => {
        if (busy.current) return;
        const blob = await captureFrame();
        if (!blob) return;
        try {
          const res = await inferFrame(blob);
          const best = res.detections
            .filter((d) => DAMAGED_CLASSES.includes(d.class_name))
            .sort((a, b) => b.confidence - a.confidence)[0];
          if (best) handleDetection({ className: best.class_name, confidence: best.confidence });
        } catch {
          // 일시적 네트워크 오류는 다음 주기에 재시도
        }
      }, INFER_INTERVAL_MS);
    } else {
      mock.current.start(handleDetection);
    }
  };

  const stopSensors = useCallback(() => {
    if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
    mock.current.stop();
    if (inferTimer.current) clearInterval(inferTimer.current);
    inferTimer.current = null;
  }, []);

  useEffect(() => stopSensors, [stopSensors]);

  const confirmEnd = () => {
    if (!window.confirm('오늘의 산책을 마칠까요?')) return;
    stopSensors();
    useWalkStore.getState().endWalk();
    navigate('/summary', { replace: true });
  };

  const last = route[route.length - 1];
  const lastPoint: [number, number] | null = last ? [last.lat, last.lng] : null;
  const currentDetection = detailIndex != null ? (detections[detailIndex] ?? null) : null;
  const reportedCount = detections.filter((d) => d.status === 'reported').length;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', overflow: 'hidden' }}>
      {/* 카메라는 항상 재생 (지도 뷰일 때도 백그라운드 캡처용) */}
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {cameraError && view === 1 && (
        <p style={{ position: 'absolute', top: '45%', width: '100%', textAlign: 'center', color: '#aaa' }}>
          카메라를 사용할 수 없어요 (HTTPS 필요)
        </p>
      )}

      {/* 지도 뷰 오버레이 */}
      {view === 0 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <MapContainer center={lastPoint ?? SEOUL} zoom={17} style={{ height: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Recenter point={lastPoint} />
            {route.length > 1 && (
              <Polyline
                positions={route.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{ color: PRIMARY, weight: 4, dashArray: '12 8' }}
              />
            )}
            {route.length > 0 && (
              <CircleMarker
                center={[route[0].lat, route[0].lng]}
                radius={8}
                pathOptions={{ color: '#fff', fillColor: PRIMARY, fillOpacity: 1, weight: 3 }}
              />
            )}
            {lastPoint && <Marker position={lastPoint} icon={dogIcon} />}
            {detections.map((d, i) =>
              d.status !== 'rejected' ? (
                <Marker key={i} position={[d.lat, d.lng]} icon={warnIcon} />
              ) : null,
            )}
          </MapContainer>
        </div>
      )}

      {/* 상단 토글 */}
      <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20 }}>
        <SegmentPill options={['지도 뷰', '카메라 뷰']} selectedIndex={view} onSelect={setView} />
      </div>

      {/* 장애물 감지 → 알림 카드 (S-11) */}
      {pendingAlertIndex != null && detailIndex == null && !intro && (
        <button
          onClick={() => {
            setDetailIndex(pendingAlertIndex);
            useWalkStore.getState().clearAlert();
          }}
          className="card"
          style={{
            position: 'absolute',
            top: 68,
            left: 16,
            right: 16,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 14,
            textAlign: 'left',
            boxShadow: '0 6px 20px rgba(0,0,0,.18)',
          }}
        >
          <span style={{ fontSize: 26 }}>⚠️</span>
          <span>
            <b style={{ display: 'block', fontSize: 15 }}>위험 요소를 발견했어요!</b>
            <span style={{ fontSize: 13, color: 'var(--subtext)' }}>
              {CLASS_KR[detections[pendingAlertIndex]?.className] ?? ''} 의심 · 눌러서 확인하기
            </span>
          </span>
        </button>
      )}

      {/* 하단 통계 + 종료 */}
      {!intro && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, zIndex: 20, display: 'grid', gap: 10 }}>
          <div className="card" style={{ display: 'flex', padding: '12px 0', background: '#fff' }}>
            {[
              [formatDuration(elapsedS), '시간'],
              [formatDistance(distanceM), '거리'],
              [String(reportedCount), '신고'],
            ].map(([value, label], i) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--subtext)' }}>{label}</div>
              </div>
            ))}
          </div>
          <button className="btn danger" onClick={confirmEnd}>
            산책 종료
          </button>
        </div>
      )}

      {/* 산책 시작 모달 */}
      {intro && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--dim)',
            display: 'flex',
            alignItems: 'center',
            padding: 24,
            zIndex: 30,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 20, padding: 22, width: '100%', position: 'relative' }}>
            <button
              onClick={() => navigate(-1)}
              style={{ position: 'absolute', top: 14, right: 14, color: 'var(--subtext)', fontSize: 16 }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>카메라가 켜졌어요!</h2>
            <p style={{ fontSize: 13, color: 'var(--subtext)', lineHeight: 1.6, marginBottom: 56 }}>
              산책 중 발견한 우리 동네 위험 요소를 신고하면
              <br />
              다른 산책자와 이웃의 안전한 이동에 도움이 됩니다.
            </p>
            <button className="btn" onClick={startSession}>
              확인했어요 🐾
            </button>
          </div>
        </div>
      )}

      {/* 장애물 감지 → 상세/신고 완료 (S-12, S-13) */}
      {detailIndex != null && (
        <DetectionModal
          detection={currentDetection}
          onResolved={(patch) => {
            if (detailIndex != null) useWalkStore.getState().updateDetection(detailIndex, patch);
          }}
          onClose={() => setDetailIndex(null)}
        />
      )}
    </div>
  );
}
