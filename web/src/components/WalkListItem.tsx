import { useNavigate } from 'react-router-dom';

import { formatDistance, formatDurationKr, todayKr } from '../geo';
import type { Walk } from '../types';

export default function WalkListItem({ walk }: { walk: Walk }) {
  const navigate = useNavigate();
  return (
    <button
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: 12,
        marginBottom: 10,
        textAlign: 'left',
      }}
      onClick={() => navigate(`/records/${walk.id}`)}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--primary-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        🐾
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{todayKr(walk.started_at)} 산책</div>
        <div style={{ fontSize: 13, color: 'var(--subtext)', marginTop: 2 }}>
          {formatDistance(walk.distance_m)} · {formatDurationKr(walk.duration_s)} 소요
        </div>
      </div>
      {walk.report_count > 0 ? (
        <span className="chip orange">신고 {walk.report_count}건</span>
      ) : (
        <span style={{ color: 'var(--subtext)', fontSize: 20 }}>›</span>
      )}
    </button>
  );
}
