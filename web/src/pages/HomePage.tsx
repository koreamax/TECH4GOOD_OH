import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getReports, getWalks } from '../api';
import MiniRouteMap from '../components/MiniRouteMap';
import ReportListItem from '../components/ReportListItem';
import WalkListItem from '../components/WalkListItem';
import { DOG_NAME } from '../config';
import { formatDistance, formatDurationKr, todayKr } from '../geo';
import type { Report, Walk } from '../types';

const SEGMENTS = ['나의 코스', '산책 기록', '신고 현황'];

/** 홈 (S-01) — 인사 + 세그먼트 탭 + 코스 카드 + 산책 시작 CTA */
export default function HomePage() {
  const navigate = useNavigate();
  const [segment, setSegment] = useState(0);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    Promise.all([getWalks(10), getReports()])
      .then(([w, r]) => {
        setWalks(w);
        setReports(r);
      })
      .catch(() => undefined); // 서버 미기동 시에도 홈은 뜬다
  }, []);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>☰</span>
        <span style={{ fontSize: 20 }}>🔔</span>
      </div>

      <h1 style={{ fontSize: 20, lineHeight: 1.45, marginBottom: 18 }}>
        안녕하세요, {DOG_NAME} 보호자님! 🐾
        <br />
        오늘도 안전한 산책을 시작해볼까요?
      </h1>

      <div style={{ display: 'flex', gap: 22, borderBottom: '1px solid var(--border)' }}>
        {SEGMENTS.map((label, i) => (
          <button
            key={label}
            onClick={() => setSegment(i)}
            style={{
              paddingBottom: 10,
              fontSize: 14,
              fontWeight: 600,
              color:
                segment === i ? (i === 2 ? 'var(--accent)' : 'var(--primary-dark)') : 'var(--subtext)',
              borderBottom:
                segment === i
                  ? `2px solid ${i === 2 ? 'var(--accent)' : 'var(--primary)'}`
                  : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 16 }}>
        {segment === 0 && (
          <>
            {walks.length === 0 && (
              <p className="empty">
                아직 산책 기록이 없어요.
                <br />첫 산책을 시작해볼까요?
              </p>
            )}
            {walks.slice(0, 3).map((walk) => (
              <div key={walk.id} className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
                <MiniRouteMap route={walk.route} />
                <div style={{ padding: 14 }}>
                  {walk.report_count > 0 && (
                    <div style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      나의 신고 내역 {walk.report_count}건
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 17 }}>{todayKr(walk.started_at)} 산책</b>
                    <button
                      onClick={() => navigate(`/records/${walk.id}`)}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 999,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      최근 경로 보기
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--subtext)', marginTop: 6 }}>
                    📍 {formatDistance(walk.distance_m)} · {formatDurationKr(walk.duration_s)} 소요
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {segment === 1 && (
          <>
            {walks.length === 0 && <p className="empty">아직 산책 기록이 없어요.</p>}
            {walks.map((walk) => (
              <WalkListItem key={walk.id} walk={walk} />
            ))}
          </>
        )}

        {segment === 2 && (
          <>
            {reports.length === 0 && <p className="empty">아직 신고 내역이 없어요.</p>}
            {reports.map((report) => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 64,
          padding: '10px 20px',
          background: 'rgba(255,255,255,.94)',
          zIndex: 40,
        }}
      >
        <button className="btn" onClick={() => navigate('/walk')}>
          오늘의 산책 시작하기! 🐾
        </button>
      </div>
    </div>
  );
}
