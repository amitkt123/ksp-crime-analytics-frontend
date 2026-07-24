import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center' },
  { path: '/case-explorer', label: 'Case Explorer' },
  { path: '/network', label: 'Network / Link Analysis' },
  { path: '/sociological', label: 'Sociological & Predictive' },
  { path: '/chat', label: 'Chat' },
  { path: '/admin', label: 'Admin / Audit' },
];

export function Rail() {
  return (
    <nav className="rail" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.path} to={item.path} className="rail-item">
          <span className="rail-tip">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
