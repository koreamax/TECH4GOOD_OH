import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { inferVideo, postDetection } from '../api';
import DetectionModal from '../components/DetectionModal';
import SegmentPill from '../components/SegmentPill';
import WalkMapOverlay from '../components/WalkMapOverlay';
import {
  ALERT_CONFIDENCE_THRESHOLD,
  CLASS_KR,
  DEMO_DETECT_VIDEOS,
  DEMO_GPS_STEP_MS,
  DEMO_NORMAL_VIDEOS,
  DEMO_ROUTE,
  DEMO_STOP_INDICES,
  DETECTION_COOLDOWN_MS,
  USE_DEMO_GPS,
} from '../config';
import { MockDetector } from '../detection/mock';
import { formatDistance, formatDuration, SEOUL } from '../geo';
import { useWalkStore } from '../store';
import type { VideoTimelineItem } from '../types';

/** 산책 화면 (S-10) — 시작 → 지도 뷰/카메라 뷰 토글 + 탐지 알림.
 *  카메라(웹캠) 대신 서버에 영상을 업로드하고, 서버가 돌려준 시각별 타임라인을
 *  영상 재생에 맞춰 "실시간 탐지처럼" 트리거한다. */
export default function WalkPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null); // 비디오 위 실시간 탐지 오버레이

  const [intro, setIntro] = useState(true);
  const [view, setView] = useState(0); // 0 지도 뷰, 1 카메라 뷰
  const [elapsedS, setElapsedS] = useState(0);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [videoSrc, setVideoSrc] = useState(DEMO_NORMAL_VIDEOS[0]); // 현재 카메라 밴드 영상

  const status = useWalkStore((s) => s.status);
  const route = useWalkStore((s) => s.route);
  const distanceM = useWalkStore((s) => s.distanceM);
  const detections = useWalkStore((s) => s.detections);
  const pendingAlertIndex = useWalkStore((s) => s.pendingAlertIndex);

  const watchId = useRef<number | null>(null);
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mock = useRef(new MockDetector());
  const timeline = useRef<VideoTimelineItem[]>([]);
  const overlayTl = useRef<VideoTimelineItem[]>([]); // 밀집 오버레이 타임라인
  const tlPtr = useRef(0);
  const tlTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafId = useRef<number | null>(null);
  const viewRef = useRef(view); // rAF 루프에서 최신 뷰 참조
  const lastLoc = useRef<{ lat: number; lng: number } | null>(null);
  const lastDetectionAt = useRef(0);
  const busy = useRef(false);

  // ===== 데모 연출 상태 =====
  // 인식 영상별 실추론 캐시(정지점에서 지연 없이 재생). 인덱스 = DEMO_DETECT_VIDEOS 순서.
  const videoData = useRef<{ timeline: VideoTimelineItem[]; overlay: VideoTimelineItem[] }[]>([]);
  const activeDetect = useRef(-1); // 현재 재생 중 인식영상 인덱스(-1 = 일반 걷기)
  const routeIdx = useRef(0); // 다음 이동할 경로 인덱스
  const normalSeg = useRef(0); // 현재 평시 세그먼트(0·1·2) — 정지 처리 후 증가
  const stoppedRef = useRef(false); // 정지점에서 멈춰 알람 대기 중인지
  const seekTarget = useRef<number | null>(null); // 인식영상 로드 후 시킹할 시각(피크 직전)

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

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

  // 현재 영상 프레임을 '박스 중심 정사각'으로 크롭하고 박스·마스크·라벨을 그려
  // 주석 프레임(object URL)을 만든다. 승인 모달에 인식된 파손이 가운데 오도록(사용자 요청).
  const captureAnnotated = useCallback((item: VideoTimelineItem): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return resolve(null);
      const W = video.videoWidth;
      const H = video.videoHeight;
      const b = item.box;
      const bw = (b.x2 - b.x1) * W;
      const bh = (b.y2 - b.y1) * H;
      const cx = ((b.x1 + b.x2) / 2) * W;
      const cy = ((b.y1 + b.y2) / 2) * H;
      // 박스를 넉넉히 감싸는 정사각 크롭 → 파손이 가운데. 프레임 경계로 클램프.
      let size = Math.max(bw, bh) * 1.9 + Math.min(W, H) * 0.05;
      size = Math.min(size, W, H);
      let sx = Math.max(0, Math.min(cx - size / 2, W - size));
      let sy = Math.max(0, Math.min(cy - size / 2, H - size));
      const c = document.createElement('canvas');
      c.width = Math.round(size);
      c.height = Math.round(size);
      const ctx = c.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
      const gx = (nx: number) => nx * W - sx; // 프레임 정규좌표 → 크롭 로컬좌표
      const gy = (ny: number) => ny * H - sy;
      if (item.mask && item.mask.length > 2) {
        ctx.beginPath();
        item.mask.forEach(([nx, ny], i) => {
          const x = gx(nx);
          const y = gy(ny);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(64,110,255,0.35)';
        ctx.fill();
      }
      ctx.lineWidth = Math.max(2, size * 0.008);
      ctx.strokeStyle = '#2f5bff';
      ctx.strokeRect(gx(b.x1), gy(b.y1), bw, bh);
      const fs = Math.max(14, Math.round(size * 0.055));
      const text = `${CLASS_KR[item.class_name] ?? item.class_name} ${item.confidence.toFixed(2)}`;
      ctx.font = `600 ${fs}px Pretendard, system-ui, sans-serif`;
      const tw = ctx.measureText(text).width;
      const ly = Math.max(0, gy(b.y1) - fs * 1.4);
      ctx.fillStyle = '#2f5bff';
      ctx.fillRect(gx(b.x1), ly, tw + fs * 0.8, fs * 1.4);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, gx(b.x1) + fs * 0.4, ly + fs * 0.7);
      c.toBlob((bl) => resolve(bl ? URL.createObjectURL(bl) : null), 'image/jpeg', 0.85);
    });
  }, []);

  // 탐지 이벤트 공통 처리: 현재 프레임 캡처 → 서버 저장 → 임계값 게이트
  const handleDetection = useCallback(
    async (e: { className: string; confidence: number; item?: VideoTimelineItem }, skipCooldown = false) => {
      const now = Date.now();
      if (busy.current) return;
      if (!skipCooldown && now - lastDetectionAt.current < DETECTION_COOLDOWN_MS) return;
      busy.current = true;
      lastDetectionAt.current = now;
      try {
        const loc = lastLoc.current ?? { lat: SEOUL[0], lng: SEOUL[1] };
        // 박스가 있는 실탐지면 실제 영상 프레임을 캡처(원본=서버·LLM용, 주석본=모달 표시용).
        // 박스 없는 이벤트(목 보강 등)는 데모 모드에서 시안 원본 파손 사진으로 폴백.
        let blob: Blob | null = null;
        let annotatedUrl: string | undefined;
        if (e.item?.box) {
          blob = await captureFrame();
          if (blob) annotatedUrl = (await captureAnnotated(e.item)) ?? undefined;
        }
        if (!blob) {
          blob = USE_DEMO_GPS
            ? await fetch('/assets/sample-damage.jpg')
                .then((r) => r.blob())
                .catch(() => null)
            : await captureFrame();
        }
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
            annotatedUrl,
            imageBlob: blob,
            status: 'pending',
            at: new Date().toISOString(),
          },
          alert, // 임계값 미만이면 알람 없이 조용히 축적 (선 승인 게이트)
        );
        if (alert) navigator.vibrate?.(300);
      } finally {
        busy.current = false;
      }
    },
    [captureFrame, captureAnnotated],
  );

  // 영상 재생 시각에 맞춰 타임라인 탐지 트리거
  const startTimelineLoop = useCallback(() => {
    if (tlTimer.current) clearInterval(tlTimer.current);
    tlTimer.current = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const items = timeline.current;
      while (tlPtr.current < items.length && v.currentTime >= items[tlPtr.current].t) {
        const item = items[tlPtr.current];
        tlPtr.current += 1;
        handleDetection({ className: item.class_name, confidence: item.confidence, item }, true);
      }
    }, 200);
  }, [handleDetection]);

  // 재생 시각에 맞는 오버레이 프레임(가장 가까운 최근 항목)을 찾는다.
  const activeOverlay = (t: number): VideoTimelineItem | null => {
    let found: VideoTimelineItem | null = null;
    for (const it of overlayTl.current) {
      if (it.t <= t + 0.05 && t - it.t < 0.9 && (!found || it.t > found.t)) found = it;
    }
    return found;
  };

  // 비디오 위에 실시간 탐지 결과(박스·마스크·라벨)를 그린다. 카메라 뷰에서만.
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.max(1, Math.round(rect.width * dpr));
    const bh = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (viewRef.current !== 1) return; // 카메라 뷰에서만 표시
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    const item = activeOverlay(video.currentTime);
    if (!item) return;
    // object-fit: cover 매핑 — 표시 영역에 맞춰 확대·크롭된 좌표 변환
    const scale = Math.max(rect.width / vw, rect.height / vh);
    const rw = vw * scale;
    const rh = vh * scale;
    const ox = (rect.width - rw) / 2;
    const oy = (rect.height - rh) / 2;
    const mx = (nx: number) => ox + nx * rw;
    const my = (ny: number) => oy + ny * rh;
    if (item.mask && item.mask.length > 2) {
      ctx.beginPath();
      item.mask.forEach(([nx, ny], i) => {
        const x = mx(nx);
        const y = my(ny);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(64,110,255,0.35)';
      ctx.fill();
    }
    const x = mx(item.box.x1);
    const y = my(item.box.y1);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#2f5bff';
    ctx.strokeRect(x, y, mx(item.box.x2) - x, my(item.box.y2) - y);
    const text = `${CLASS_KR[item.class_name] ?? item.class_name} ${item.confidence.toFixed(2)}`;
    ctx.font = '600 13px Pretendard, system-ui, sans-serif';
    const tw = ctx.measureText(text).width;
    const ly = Math.max(0, y - 20);
    ctx.fillStyle = '#2f5bff';
    ctx.fillRect(x, ly, tw + 12, 20);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 6, ly + 10);
  }, []);

  // 산책 중에는 매 프레임 오버레이를 다시 그린다 (영상 재생 시각과 동기).
  useEffect(() => {
    if (status !== 'walking') return;
    const loop = () => {
      drawOverlay();
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
    };
  }, [status, drawOverlay]);

  // 카메라 밴드 영상을 교체하고, 그 영상의 실추론 타임라인/오버레이를 활성화한다.
  const switchVideo = useCallback((src: string, detectIndex: number) => {
    activeDetect.current = detectIndex;
    const data = detectIndex >= 0 ? videoData.current[detectIndex] : null;
    timeline.current = data?.timeline ?? [];
    overlayTl.current = data?.overlay ?? [];
    tlPtr.current = 0;
    // 인식영상은 피크(파손) 직전으로 시킹 → 카메라 전환 직후 바로 박스·알람이 뜬다.
    const peakT = data?.timeline?.[0]?.t;
    seekTarget.current = peakT != null ? Math.max(0, peakT - 0.2) : null;
    setVideoSrc(src); // <video src> 변경 → 아래 effect가 재생, onLoadedData가 시킹
  }, []);

  // videoSrc가 바뀌면 처음부터 재생(새 소스는 currentTime 0으로 리셋됨).
  useEffect(() => {
    if (status !== 'walking') return;
    const v = videoRef.current;
    v?.play().catch(() => undefined);
  }, [videoSrc, status]);

  // 정지점 도달 → 핀 멈춤 + 해당 인식 영상으로 카메라뷰 자동 전환(사용자 확정).
  const triggerDetectionStop = useCallback(
    (k: number) => {
      stoppedRef.current = true;
      switchVideo(DEMO_DETECT_VIDEOS[k], k);
      setView(1); // 자동 카메라뷰
    },
    [switchVideo],
  );

  // 경로를 한 스텝 이동. 정지점 인덱스면 멈춰서 인식 시퀀스 시작.
  const walkStep = useCallback(() => {
    const i = routeIdx.current;
    if (i >= DEMO_ROUTE.length) return; // 완주
    const [lat, lng] = DEMO_ROUTE[i];
    lastLoc.current = { lat, lng };
    useWalkStore.getState().addRoutePoint(lat, lng);
    routeIdx.current = i + 1;
    const k = DEMO_STOP_INDICES.indexOf(i);
    if (k >= 0) {
      triggerDetectionStop(k);
      return; // 다음 스텝 예약 안 함 → 정지 (모달 처리 후 재개)
    }
    demoTimer.current = setTimeout(walkStep, DEMO_GPS_STEP_MS);
  }, [triggerDetectionStop]);

  // 모달 처리 후: 다음 평시 세그먼트 영상·지도뷰로 복귀하고 다음 구간으로 이동 재개.
  const resumeWalk = useCallback(() => {
    if (!stoppedRef.current) return;
    stoppedRef.current = false;
    normalSeg.current = Math.min(normalSeg.current + 1, DEMO_NORMAL_VIDEOS.length - 1);
    switchVideo(DEMO_NORMAL_VIDEOS[normalSeg.current], -1);
    setView(0);
    demoTimer.current = setTimeout(walkStep, DEMO_GPS_STEP_MS);
  }, [switchVideo, walkStep]);

  const startSession = async () => {
    setIntro(false);
    useWalkStore.getState().startWalk();
    routeIdx.current = 0;
    normalSeg.current = 0;
    stoppedRef.current = false;

    // 인식 영상들을 미리 서버 실추론 → 정지점에서 지연 없이 재생(캐시).
    setAnalyzing(true);
    try {
      videoData.current = await Promise.all(
        DEMO_DETECT_VIDEOS.map(async (src) => {
          const blob = await fetch(src).then((r) => r.blob());
          const r = await inferVideo(blob, 0);
          return {
            timeline: [...r.detections].sort((a, b) => a.t - b.t),
            overlay: [...(r.overlay ?? [])].sort((a, b) => a.t - b.t),
          };
        }),
      );
    } catch {
      videoData.current = DEMO_DETECT_VIDEOS.map(() => ({ timeline: [], overlay: [] }));
    } finally {
      setAnalyzing(false);
    }

    // 평시1 영상 재생 + 탐지 타임라인 루프 시작(영상 전환에도 계속 동작).
    switchVideo(DEMO_NORMAL_VIDEOS[0], -1);
    startTimelineLoop();

    if (USE_DEMO_GPS) {
      // 모의 GPS: 경로(석촌호수·인도)를 따라 이동하다 정지점에서 멈춰 인식 시퀀스.
      walkStep();
    } else {
      // 실제 GPS 추적 (연출 없음) — 첫 인식영상 재생으로 알람 1회 시연.
      const onPos = (p: GeolocationPosition) => {
        lastLoc.current = { lat: p.coords.latitude, lng: p.coords.longitude };
        useWalkStore.getState().addRoutePoint(p.coords.latitude, p.coords.longitude);
      };
      navigator.geolocation?.getCurrentPosition(onPos, () => undefined, { enableHighAccuracy: true });
      watchId.current =
        navigator.geolocation?.watchPosition(onPos, () => undefined, {
          enableHighAccuracy: true,
        }) ?? null;
      switchVideo(DEMO_DETECT_VIDEOS[0], 0);
      setView(1);
    }
  };

  const stopSensors = useCallback(() => {
    if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
    if (demoTimer.current) clearTimeout(demoTimer.current);
    demoTimer.current = null;
    mock.current.stop();
    if (tlTimer.current) clearInterval(tlTimer.current);
    tlTimer.current = null;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = null;
    videoRef.current?.pause();
  }, []);

  useEffect(() => stopSensors, [stopSensors]);

  const confirmEnd = () => {
    if (!window.confirm('오늘의 산책을 마칠까요?')) return;
    stopSensors();
    useWalkStore.getState().endWalk();
    navigate('/summary', { replace: true });
  };

  const currentDetection = detailIndex != null ? (detections[detailIndex] ?? null) : null;
  const reportedCount = detections.filter((d) => d.status === 'reported').length;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', overflow: 'hidden' }}>
      {/* 영상은 항상 재생 (지도 뷰일 때도 백그라운드 프레임 캡처용).
          시안 카메라 뷰 = 흰 배경 + 중앙 밴드 */}
      <video
        ref={videoRef}
        src={videoSrc}
        muted
        playsInline
        loop
        preload="auto"
        onError={() => setVideoError(true)}
        onLoadedData={() => {
          setVideoError(false);
          const v = videoRef.current;
          if (v && seekTarget.current != null) {
            try {
              v.currentTime = seekTarget.current; // 피크 직전으로 점프 → 즉시 탐지
            } catch {
              /* 아직 시킹 불가면 무시 */
            }
            seekTarget.current = null;
          }
        }}
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '100%',
          height: '46%',
          objectFit: 'cover',
        }}
      />
      {/* 실시간 탐지 오버레이 — 영상 밴드와 동일 영역, 카메라 뷰에서만 렌더 */}
      <canvas
        ref={overlayRef}
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '100%',
          height: '46%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {videoError && view === 1 && (
        <p style={{ position: 'absolute', top: '45%', width: '100%', textAlign: 'center', color: '#aaa' }}>
          영상을 불러올 수 없어요
        </p>
      )}

      {/* 지도 뷰 오버레이 */}
      {view === 0 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <WalkMapOverlay route={route} detections={detections} />
        </div>
      )}

      {/* 상단 토글 */}
      <div style={{ position: 'absolute', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20 }}>
        <SegmentPill options={['지도 뷰', '카메라 뷰']} selectedIndex={view} onSelect={setView} />
      </div>

      {/* 분석 중 인디케이터 (카메라 뷰) */}
      {analyzing && view === 1 && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 20,
          }}
        >
          <span
            style={{
              background: 'rgba(0,0,0,.55)',
              color: '#fff',
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 999,
            }}
          >
            ● AI 실시간 분석 중…
          </span>
        </div>
      )}

      {/* 장애물 감지 → 알림: 하단 다크 토스트 + 플로팅 버튼 (S-11, 시안 원본) */}
      {!intro && (
        <div
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 176,
            zIndex: 20,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          {pendingAlertIndex != null && detailIndex == null && (
            <button
              onClick={() => {
                setDetailIndex(pendingAlertIndex);
                useWalkStore.getState().clearAlert();
              }}
              style={{
                flex: 1,
                background: '#11181d',
                borderRadius: 12,
                padding: 16,
                textAlign: 'left',
              }}
            >
              <p style={{ color: '#fd7565', fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>
                장애물 감지 경고 발동!
              </p>
              <p
                style={{
                  color: '#9aa7b2',
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 1.4,
                  letterSpacing: '-0.24px',
                  marginTop: 4,
                }}
              >
                앞쪽에 보행 장애물이 감지되었어요. 확인 후 위험 요소가 맞다면 동네 안전
                데이터로 공유해주세요.
              </p>
            </button>
          )}
          <button
            aria-label={CLASS_KR[detections[pendingAlertIndex ?? -1]?.className] ?? '감지 알림'}
            onClick={() => {
              if (pendingAlertIndex != null) {
                setDetailIndex(pendingAlertIndex);
                useWalkStore.getState().clearAlert();
              }
            }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: '#fff',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: pendingAlertIndex != null ? '1px solid #fd7565' : '1px solid #e8e8e8',
              boxShadow:
                pendingAlertIndex != null
                  ? '0 4px 10px rgba(253,117,101,.5)'
                  : '0 4px 10px rgba(0,0,0,.12)',
            }}
          >
            <img
              src="/assets/notice-red.svg"
              alt=""
              width={30}
              height={30}
              style={pendingAlertIndex == null ? { filter: 'grayscale(1) opacity(.45)' } : undefined}
            />
          </button>
        </div>
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

      {/* 산책 시작 모달 (85:834 시안 원본) */}
      {intro && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(6,6,6,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 21,
            zIndex: 30,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '24px 18px',
              width: 360,
              maxWidth: '100%',
              display: 'grid',
              gap: 18,
              boxShadow: '0 4px 10px rgba(0,0,0,.05)',
            }}
          >
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
                  카메라가 켜졌어요!
                </h2>
                <button onClick={() => navigate(-1)} style={{ fontSize: 18, color: 'var(--ink)' }}>
                  ✕
                </button>
              </div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray500)', lineHeight: 1.4, letterSpacing: '-0.28px' }}>
                산책 중 발견한 우리 동네 보행 장애물을 신고하면
                <br />
                다른 산책자와 이웃의 안전한 이동에 도움이 될 수 있어요.
              </p>
            </div>
            <img
              src="/assets/illust-camera.svg"
              alt=""
              style={{ height: 160, objectFit: 'contain', justifySelf: 'center' }}
            />
            <button className="btn" onClick={startSession}>
              확인했어요
              <img src="/assets/logo-paw.svg" alt="" width={16} height={16} />
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
          onClose={() => {
            setDetailIndex(null);
            resumeWalk(); // 정지 상태였으면 다음 구간으로 이동 재개
          }}
        />
      )}
    </div>
  );
}
