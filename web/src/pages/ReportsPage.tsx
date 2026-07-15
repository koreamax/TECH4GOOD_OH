import { useEffect, useState } from 'react';

import { getReports } from '../api';
import ReportListItem from '../components/ReportListItem';
import type { Report } from '../types';

/** 신고 현황 탭 (S-03) */
export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    getReports().then(setReports).catch(() => undefined);
  }, []);

  return (
    <div className="page">
      <h1 style={{ fontSize: 22 }}>신고 현황</h1>
      <p style={{ fontSize: 13, color: 'var(--subtext)', margin: '4px 0 16px' }}>
        내 산책이 만든 변화를 확인해보세요
      </p>
      {reports.length === 0 && (
        <p className="empty">
          아직 신고 내역이 없어요.
          <br />
          산책 중 발견한 위험 요소를 신고해보세요!
        </p>
      )}
      {reports.map((report) => (
        <ReportListItem key={report.id} report={report} />
      ))}
    </div>
  );
}
