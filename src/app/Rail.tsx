import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  {
    path: '/command-center',
    label: 'Command Center',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    path: '/case-explorer',
    label: 'Case Explorer',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.4l1.6 2h9a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-11Z" />
      </svg>
    ),
  },
  {
    path: '/network',
    label: 'Network / Link Analysis',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="18" cy="6" r="2.4" />
        <circle cx="12" cy="18" r="2.4" />
        <path d="M8 7.2 10.5 15.5M16 7.2 13.5 15.5M8.4 6h7.2" />
      </svg>
    ),
  },
  {
    path: '/sociological',
    label: 'Sociological & Predictive',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 17 9 11l4 4 8-9" />
        <path d="M15 6h6v6" />
      </svg>
    ),
  },
  {
    path: '/chat',
    label: 'Chat',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
      </svg>
    ),
  },
  {
    path: '/admin',
    label: 'Admin / Audit',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5 19 6v5.2c0 4.2-2.9 7.3-7 8.3-4.1-1-7-4.1-7-8.3V6l7-2.5Z" />
        <path d="M9 12l2 2 4-4.2" />
      </svg>
    ),
  },
];

export function Rail() {
  return (
    <nav className="rail" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.path} to={item.path} className="rail-item" aria-label={item.label}>
          {item.icon}
          <span className="rail-tip">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
