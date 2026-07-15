import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getWalk, mediaUrl } from '../api';
import MiniRouteMap from '../components/MiniRouteMap';
import ReportListItem from '../components/ReportListItem';
import { formatDistance, formatDurationKr, todayKr } from '../geo';
import type { WalkDetail } from '../types';

/** 기록 상세 (S-21) — 경로 + 사진 아카이브 + 신고 내역 */
export default function RecordDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [walk, setWalk] = useState<WalkDetail | null>(null);

  useEffect(() => {
    if (id) getWalk(Number(id)).then(setWalk).catch(() => undefined);
  }, [id]);

  if (!walk) {
    return <p className="empty">불러오는 중…</p>;
  }

  const photos = [
    ...(walk.dog_photo_url ? [walk.dog_photo_url] : []),
    ...walk.detections.map((d) => d.image_url).filter((u): u is string => !!u),
  ];

  return (
    <div className="page" style={{ padding: 0, paddingBottom: 96 }}>
      <MiniRouteMap route={walk.route} height={220} />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)} style={{ fontSize: 22 }}>
            ‹
          </button>
          <h1 style={{ fontSize: 20 }}>{todayKr(walk.started_at)} 산책</h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--subtext)', marginTop: 4 }}>
          {formatDistance(walk.distance_m)} · {formatDurationKr(walk.duration_s)} 소요 · 발견{' '}
          {walk.detection_count}건 · 신고 {walk.report_count}건
        </p>

        {photos.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, margin: '20px 0 10px' }}>사진 아카이브</h2>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
              {photos.map((p, i) => (
                <img
                  key={i}
                  src={mediaUrl(p) ?? p}
                  alt=""
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 16,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {walk.reports.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, margin: '20px 0 10px' }}>신고 내역</h2>
            {walk.reports.map((r) => (
              <ReportListItem
                key={r.id}
                report={{
                  ...r,
                  detection: walk.detections.find((d) => d.id === r.detection_id) ?? null,
                }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
