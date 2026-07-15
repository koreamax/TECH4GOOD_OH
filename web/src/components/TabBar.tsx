import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', icon: '🏠', label: '홈' },
  { to: '/map', icon: '🗺️', label: '산책 지도' },
  { to: '/reports', icon: '📢', label: '신고 현황' },
  { to: '/my', icon: '🐶', label: '마이' },
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
          <span className="icon">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
