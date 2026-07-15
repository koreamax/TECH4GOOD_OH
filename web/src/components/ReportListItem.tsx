import { mediaUrl } from '../api';
import { CLASS_KR } from '../config';
import type { Report } from '../types';

export default function ReportListItem({ report }: { report: Report }) {
  const thumb = mediaUrl(report.detection?.image_url ?? null);
  return (
    <div
      className="card"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 }}
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 10,
            background: '#f2f2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ⚠️
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {report.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 2 }}>
          {report.detection ? `${CLASS_KR[report.detection.class_name] ?? ''} · ` : ''}
          {report.receipt_no}
        </div>
        <div style={{ fontSize: 11, color: 'var(--subtext)', marginTop: 2 }}>
          {report.created_at.slice(0, 10)}
        </div>
      </div>
      <span className="chip green">{report.status}</span>
    </div>
  );
}
