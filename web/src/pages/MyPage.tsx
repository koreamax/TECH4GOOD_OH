import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getWalks } from '../api';
import { DOG_NAME, USER_NAME } from '../config';
import { formatDistance } from '../geo';
import type { Walk } from '../types';

/** 마이 탭 (S-04) — 강아지 프로필 + 누적 순찰 기여 */
export default function MyPage() {
  const navigate = useNavigate();
  const [walks, setWalks] = useState<Walk[]>([]);

  useEffect(() => {
    getWalks(100).then(setWalks).catch(() => undefined);
  }, []);

  const totalDistance = walks.reduce((sum, w) => sum + w.distance_m, 0);
  const totalReports = walks.reduce((sum, w) => sum + w.report_count, 0);

  const stats: [string, string, boolean][] = [
    [String(walks.length), '총 산책', false],
    [formatDistance(totalDistance), '총 거리', false],
    [String(totalReports), '총 신고', totalReports > 0],
  ];

  return (
    <div className="page">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: 18,
          borderRadius: 16,
          background: 'var(--primary-light)',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: '#fff',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <img
            src="/assets/dog-photo.png"
            alt={`${DOG_NAME} 프로필`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{DOG_NAME}</div>
          <div style={{ fontSize: 13, color: 'var(--subtext)', marginTop: 2 }}>
            {USER_NAME} · Paw Patrol 순찰대원
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {stats.map(([value, label, accent]) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '16px 4px' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: accent ? 'var(--accent)' : 'var(--text)' }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/records')}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '16px 4px',
          borderBottom: '1px solid var(--border)',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        산책 기록 전체 보기
        <span style={{ color: 'var(--subtext)', fontSize: 20 }}>›</span>
      </button>

      <p style={{ textAlign: 'center', color: 'var(--subtext)', fontSize: 12, padding: '30px 0' }}>
        {DOG_NAME}의 산책이 우리 동네를 더 안전하게 만들고 있어요 🐾
      </p>
    </div>
  );
}
