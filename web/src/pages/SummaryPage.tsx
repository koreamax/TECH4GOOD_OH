import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { postWalk } from '../api';
import MiniRouteMap from '../components/MiniRouteMap';
import { DOG_NAME, USER_NAME } from '../config';
import { formatDistance, formatDurationKr } from '../geo';
import { useWalkStore } from '../store';

/** 산책 종료 요약 (S-14) — 나이키 러닝 스타일 카드 */
export default function SummaryPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { route, distanceM, detections, startedAt, endedAt } = useWalkStore();
  const [dogPhoto, setDogPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const durationS =
    startedAt && endedAt
      ? Math.max(0, (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
      : 0;
  const reportedCount = detections.filter((d) => d.status === 'reported').length;

  const leave = () => {
    useWalkStore.getState().reset();
    navigate('/', { replace: true });
  };

  const save = async () => {
    setSaving(true);
    try {
      await postWalk({
        route,
        startedAt: startedAt ?? new Date().toISOString(),
        endedAt: endedAt ?? new Date().toISOString(),
        distanceM: Math.round(distanceM),
        durationS: Math.round(durationS),
        detectionIds: detections.map((d) => d.serverId).filter((id): id is number => id != null),
        userName: USER_NAME,
        dogPhoto,
      });
      leave();
    } catch (e) {
      alert(`저장 실패 — 서버(VITE_API_URL)를 확인해주세요.\n${e instanceof Error ? e.message : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const stats: [string, string][] = [
    [formatDistance(distanceM), '거리'],
    [formatDurationKr(durationS), '시간'],
    [String(detections.length), '발견'],
    [String(reportedCount), '신고'],
  ];

  return (
    <div className="page" style={{ paddingBottom: 24 }}>
      <h1 style={{ fontSize: 24, marginTop: 8 }}>산책 완료! 🐾</h1>
      <p style={{ color: 'var(--subtext)', fontSize: 14, margin: '6px 0 18px' }}>
        {DOG_NAME}와 함께한 오늘의 순찰 기록이에요
      </p>

      <div className="card" style={{ overflow: 'hidden' }}>
        <MiniRouteMap route={route} height={200} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
        {stats.map(([value, label], i) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '14px 4px' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: i === 3 && reportedCount > 0 ? 'var(--accent)' : 'var(--text)' }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => setDogPhoto(e.target.files?.[0] ?? null)}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="card"
        style={{
          width: '100%',
          margin: '16px 0 20px',
          borderStyle: 'dashed',
          overflow: 'hidden',
          padding: dogPhoto ? 0 : '28px 0',
        }}
      >
        {dogPhoto ? (
          <img
            src={URL.createObjectURL(dogPhoto)}
            alt="강아지 사진"
            style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ color: 'var(--subtext)', fontSize: 13 }}>
            📷 오늘의 {DOG_NAME} 사진 남기기
          </span>
        )}
      </button>

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? '저장 중…' : '기록 저장하기'}
      </button>
      <button
        onClick={leave}
        style={{ width: '100%', padding: 14, color: 'var(--subtext)', fontSize: 13 }}
      >
        저장하지 않고 나가기
      </button>
    </div>
  );
}
