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
