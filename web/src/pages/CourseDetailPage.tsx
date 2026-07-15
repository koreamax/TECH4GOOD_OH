import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import MiniRouteMap from '../components/MiniRouteMap';
import { findRecommendedCourse } from '../courseData';

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const course = findRecommendedCourse(courseId ?? null);
  const route = useMemo(
    () => course?.route.map(([lat, lng]) => ({ lat, lng, t: new Date(0).toISOString() })) ?? [],
    [course],
  );

  if (!course) {
    return (
      <div className="page" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center', display: 'grid', gap: 16 }}>
          <p style={{ color: 'var(--gray600)' }}>추천 코스를 찾지 못했어요.</p>
          <button className="btn" onClick={() => navigate('/')}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: 0, paddingBottom: 170 }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 20px',
          background: 'rgba(255,255,255,.96)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button aria-label="뒤로 가기" onClick={() => navigate(-1)} style={{ fontSize: 24, lineHeight: 1 }}>
          ‹
        </button>
        <b style={{ fontSize: 18, fontWeight: 600 }}>추천 코스</b>
      </div>

      <img
        src={course.photo}
        alt={course.title}
        style={{ width: '100%', height: 210, display: 'block', objectFit: 'cover' }}
      />

      <div style={{ padding: '22px 20px', display: 'grid', gap: 22 }}>
        <section style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {course.tags.map((tag) => (
              <span key={tag} className="chip green" style={{ fontWeight: 500 }}>
                {tag}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>{course.title}</h1>
            <span style={{ fontSize: 13, color: 'var(--gray500)' }}>{course.area}</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--gray600)', lineHeight: 1.55 }}>{course.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray600)' }}>
            <img src="/assets/icon-pin-small.svg" alt="" width={18} height={18} />
            <b style={{ fontSize: 15 }}>{course.distance}</b>
            <span>·</span>
            <span style={{ fontSize: 15 }}>{course.duration} 소요</span>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>코스 미리보기</h2>
            <span style={{ color: 'var(--route)', fontSize: 12, fontWeight: 600 }}>파란 점선을 따라 걸어요</span>
          </div>
          <div className="card" style={{ overflow: 'hidden', borderRadius: 16 }}>
            <MiniRouteMap route={route} height={235} />
          </div>
        </section>

      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          padding: '30px 20px 78px',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0), #fff 28%)',
        }}
      >
        <button className="btn" onClick={() => navigate(`/walk?course=${course.id}`)}>
          이 코스로 산책 시작하기
          <img src="/assets/logo-paw.svg" alt="" width={16} height={16} />
        </button>
      </div>
    </div>
  );
}
