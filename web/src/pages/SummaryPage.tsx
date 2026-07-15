import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { postWalk } from '../api';
import MiniRouteMap from '../components/MiniRouteMap';
import { CLASS_KR, DOG_NAME, USER_NAME } from '../config';
import { useWalkStore } from '../store';

function timeAmPm(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** 산책 종료 (113:663 시안) — 자동 저장 후 오늘의 산책 코스 + 발견 타임라인 표시 */
export default function SummaryPage() {
  const navigate = useNavigate();
  const { route, distanceM, detections, startedAt, endedAt } = useWalkStore();
  const saved = useRef(false);

  // 시안에는 저장 버튼이 없으므로 진입 시 자동 저장 (서버 불가 시에도 화면은 유지)
  useEffect(() => {
    if (saved.current || route.length === 0) return;
    saved.current = true;
    const durationS =
      startedAt && endedAt
        ? Math.max(0, (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
        : 0;
    postWalk({
      route,
      startedAt: startedAt ?? new Date().toISOString(),
      endedAt: endedAt ?? new Date().toISOString(),
      distanceM: Math.round(distanceM),
      durationS: Math.round(durationS),
      detectionIds: detections.map((d) => d.serverId).filter((id): id is number => id != null),
      userName: USER_NAME,
    }).catch((e) => console.warn('산책 저장 실패:', e));
  }, [route, distanceM, detections, startedAt, endedAt]);

  const leave = () => {
    useWalkStore.getState().reset();
    navigate('/', { replace: true });
  };

  const reported = detections.filter((d) => d.status === 'reported');
  const rows = detections
    .filter((d) => d.status !== 'rejected')
    .slice()
    .reverse()
    .map((d) => ({
      label: `${CLASS_KR[d.className] ?? d.className} ${d.status === 'reported' ? '신고 발견' : '발견'}`,
      time: timeAmPm(d.at),
    }));

  return (
    <div className="page" style={{ padding: 0, paddingBottom: 96 }}>
      {/* 상단 ✕ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px' }}>
        <button onClick={leave} style={{ fontSize: 20, color: 'var(--ink)', padding: 4 }}>
          ✕
        </button>
      </div>

      {/* 타이틀 — Display SB 22 + Body R 16 */}
      <div style={{ padding: '10px 20px', display: 'grid', gap: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>
          {DOG_NAME}와의 오늘 산책이 종료되었어요 🐾
        </h1>
        <p style={{ fontSize: 16, fontWeight: 400, color: 'var(--gray600)', lineHeight: 1.4 }}>
          즐거운 산책과 함께 우리 동네 안전에도 기여했어요
        </p>
      </div>

      <div style={{ padding: '24px 20px 0', display: 'grid', gap: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>오늘의 산책 코스</h2>

        {/* 경로 + 신고 완료 마커 지도 (r16, h320) */}
        <div style={{ borderRadius: 16, overflow: 'hidden' }}>
          <MiniRouteMap
            route={route}
            height={320}
            markers={reported.map((d) => ({ lat: d.lat, lng: d.lng }))}
          />
        </div>

        {/* 발견 타임라인 — bg #F2F5F6, 코랄 도트 + 점선 연결 */}
        {rows.length > 0 && (
          <div style={{ background: '#f2f5f6', borderRadius: 8, padding: '20px 16px' }}>
            <div style={{ display: 'grid', gap: 0 }}>
              {rows.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  {/* 도트 + 연결 점선 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: 'var(--accent)',
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                    {i < rows.length - 1 && (
                      <span
                        style={{
                          flex: 1,
                          borderLeft: '2px dotted #f9b0a7',
                          margin: '4px 0',
                          minHeight: 16,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: i < rows.length - 1 ? 16 : 0,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.28px' }}>
                      {row.label}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--gray500)', letterSpacing: '-0.28px' }}>
                      {row.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
