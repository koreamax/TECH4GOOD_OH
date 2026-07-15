import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getWalks } from '../api';
import WalkListItem from '../components/WalkListItem';
import type { Walk } from '../types';

/** 산책 기록 (S-20) */
export default function RecordsPage() {
  const navigate = useNavigate();
  const [walks, setWalks] = useState<Walk[]>([]);

  useEffect(() => {
    getWalks(100).then(setWalks).catch(() => undefined);
  }, []);

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 22 }}>
          ‹
        </button>
        <h1 style={{ fontSize: 20 }}>산책 기록</h1>
      </div>
      {walks.length === 0 && <p className="empty">아직 산책 기록이 없어요.</p>}
      {walks.map((walk) => (
        <WalkListItem key={walk.id} walk={walk} />
      ))}
    </div>
  );
}
