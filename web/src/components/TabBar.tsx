import { NavLink, useLocation } from 'react-router-dom';

// 아이콘 = 피그마 시안 원본 SVG (public/assets), mask 로 활성/비활성 색 전환
const TABS = [
  { to: '/', icon: '/assets/icon-home.svg', label: '홈' },
  { to: '/map', icon: '/assets/icon-location.svg', label: '산책 지도' },
  { to: '/reports', icon: '/assets/icon-notice.svg', label: '신고 현황' },
  { to: '/my', icon: '/assets/icon-user.svg', label: '마이' },
];

export default function TabBar() {
  const { pathname } = useLocation();
  const isWalking = pathname.startsWith('/walk');

  return (
    <nav className={`tabbar${isWalking ? ' walking' : ''}`} aria-label="주요 메뉴">
      {TABS.map((tab) => {
        const walkMapActive = tab.to === '/map' && isWalking;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            aria-disabled={isWalking}
            onClick={(event) => {
              // 산책 중에는 탭 바를 현재 위치 안내용으로만 보여준다.
              // 화면을 벗어나 센서·타이머가 중단되는 것을 막는다.
              if (isWalking) event.preventDefault();
            }}
            className={({ isActive }) => (isActive || walkMapActive ? 'active' : '')}
          >
            <span className="icon" style={{ ['--icon' as string]: `url(${tab.icon})` }} />
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
