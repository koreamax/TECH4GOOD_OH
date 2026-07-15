import { NavLink } from 'react-router-dom';

// 아이콘 = 피그마 시안 원본 SVG (public/assets), mask 로 활성/비활성 색 전환
const TABS = [
  { to: '/', icon: '/assets/icon-home.svg', label: '홈' },
  { to: '/map', icon: '/assets/icon-location.svg', label: '산책 지도' },
  { to: '/reports', icon: '/assets/icon-notice.svg', label: '신고 현황' },
  { to: '/my', icon: '/assets/icon-user.svg', label: '마이' },
];

export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <span className="icon" style={{ ['--icon' as string]: `url(${tab.icon})` }} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
