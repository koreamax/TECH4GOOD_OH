import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getReports, getWalks } from '../api';
import ReportListItem from '../components/ReportListItem';
import { DOG_NAME } from '../config';
import { formatDistance, formatDurationKr, todayKr } from '../geo';
import type { Report, Walk } from '../types';

// 시안(11:314) 원본 목업 카드 — 산책 기록이 없을 때 그대로 노출
const MOCK_COURSES = [
  {
    photo: '/assets/course-seokchon.png',
    reports: 6,
    title: '석촌 호수',
    area: '서울 송파구',
    meta: '2km · 35분 소요',
    chip: '최근 경로 보기',
  },
  {
    photo: '/assets/course-bukhansan.png',
    reports: 2,
    title: '북한산 둘레길',
    area: '서울 강북구',
    meta: '1.1km · 18분 소요',
    chip: '최근 산책 코스',
  },
  {
    photo: '/assets/course-ogeum.png',
    reports: 1,
    title: '오금 공원',
    area: '서울 송파구',
    meta: '0.5km · 13분 소요',
    chip: '최근 경로 보기',
  },
];

const TABS = ['나의 코스', '코스 추천', '신고 현황'] as const;

interface CourseCardProps {
  photo: string;
  reports: number;
  title: string;
  area: string;
  meta: string;
  chip: string;
  onChip?: () => void;
}

/** 시안 Home Card — 사진(160) + 정보영역 + 우측 칩 버튼 */
function CourseCard({ photo, reports, title, area, meta, chip, onChip }: CourseCardProps) {
  return (
    <div className="card" style={{ overflow: 'hidden', width: '100%' }}>
      <img src={photo} alt={title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'grid', gap: 4 }}>
          {reports > 0 && (
            <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600, letterSpacing: '-0.24px' }}>
              나의 신고 내역 {reports}건
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <b style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{title}</b>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray600)', letterSpacing: '-0.24px' }}>
              {area}
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <img src="/assets/icon-pin-small.svg" alt="" width={16} height={16} />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray500)', letterSpacing: '-0.24px' }}>
              {meta}
            </span>
          </span>
        </div>
        <button
          onClick={onChip}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '12px 8px',
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <img src="/assets/icon-chip-route.svg" alt="" width={20} height={20} />
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--gray600)', letterSpacing: '-0.2px' }}>
            {chip}
          </span>
        </button>
      </div>
    </div>
  );
}

/** 홈 (11:314) — 인사 + 탭(나의 코스/코스 추천/신고 현황) + 코스 카드 + 산책 시작 CTA */
export default function HomePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    Promise.all([getWalks(10), getReports()])
      .then(([w, r]) => {
        setWalks(w);
        setReports(r);
      })
      .catch(() => undefined); // 서버 미기동 시에도 홈은 뜬다 (목업 카드 노출)
  }, []);

  return (
    <div className="page" style={{ padding: 0, paddingBottom: 64 }}>
      {/* Top Bar — 시안: 우측 정렬 메뉴/벨 아이콘 28px */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px' }}>
        <img src="/assets/icon-menu.svg" alt="메뉴" width={28} height={28} />
        <img src="/assets/icon-bell.svg" alt="알림" width={28} height={28} />
      </div>

      {/* Greeting — Display SB 22 */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 1.4,
          color: 'var(--ink)',
          padding: '10px 20px',
        }}
      >
        안녕하세요, {DOG_NAME} 보호자님! 🐾
        <br />
        오늘도 안전한 산책을 시작해볼까요?
      </h1>

      {/* Tabs — 3등분, SemiBold 16, 활성 그린(신고 현황은 코랄) */}
      <div style={{ display: 'flex', padding: '0 20px' }}>
        {TABS.map((label, i) => {
          const active = tab === i;
          const color = i === 2 ? '#fd7565' : active ? '#41d596' : 'var(--gray600)';
          return (
            <button
              key={label}
              onClick={() => setTab(i)}
              style={{
                flex: 1,
                padding: '15px 12px',
                fontSize: 16,
                fontWeight: 600,
                color,
                borderBottom: `1.5px solid ${active ? (i === 2 ? '#fd7565' : '#41d596') : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Card List — gap 14, padding 20 */}
      <div style={{ display: 'grid', gap: 14, padding: 20, paddingBottom: 170 }}>
        {tab === 0 &&
          (walks.length > 0
            ? walks.map((walk, i) => (
                <CourseCard
                  key={walk.id}
                  photo={MOCK_COURSES[i % MOCK_COURSES.length].photo}
                  reports={walk.report_count}
                  title={`${todayKr(walk.started_at)} 산책`}
                  area="우리 동네"
                  meta={`${formatDistance(walk.distance_m)} · ${formatDurationKr(walk.duration_s)} 소요`}
                  chip="최근 경로 보기"
                  onChip={() => navigate(`/records/${walk.id}`)}
                />
              ))
            : MOCK_COURSES.map((c) => <CourseCard key={c.title} {...c} />))}

        {tab === 1 && (
          <>
            {MOCK_COURSES.map((c) => (
              <CourseCard key={c.title} {...c} reports={0} chip="코스 보기" />
            ))}
            <p style={{ textAlign: 'center', color: 'var(--subtext)', fontSize: 12 }}>
              이웃 반려인들이 걸은 코스를 추천해드려요
            </p>
          </>
        )}

        {tab === 2 && (
          <>
            {reports.length === 0 && <p className="empty">아직 신고 내역이 없어요.</p>}
            {reports.map((report) => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </>
        )}
      </div>

      {/* CTA — 그라데이션 컨테이너 + 그린 버튼 + 발바닥 로고 (시안 원본).
          탭바 뒤까지 흰 배경으로 이어져 아래 틈이 없다 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '30px 20px 78px',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0) 6%, #fff 32%)',
          zIndex: 40,
        }}
      >
        <button className="btn" onClick={() => navigate('/walk')}>
          오늘의 산책 시작하기
          <img src="/assets/logo-paw.svg" alt="" width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
