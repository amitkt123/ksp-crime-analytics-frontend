import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccessRoute } from '../auth/roleRouting';

const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center' },
  { path: '/overview', label: 'Overview' },
  { path: '/crime-trends', label: 'Crime Trends' },
  { path: '/demographics', label: 'Demographics' },
  { path: '/investigation-network', label: 'Investigation Network' },
  { path: '/judicial-units', label: 'Judicial & Units' },
  { path: '/case-explorer', label: 'Case Explorer' },
  { path: '/network', label: 'Network / Link Analysis' },
  { path: '/sociological', label: 'Sociological & Predictive' },
  { path: '/admin', label: 'Admin / Audit' },
];

export function TopNavPills() {
  const { roles } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => canAccessRoute(roles, item.path));

  return (
    <nav className="pill-nav" aria-label="Primary">
      {visibleItems.map(({ path, label }) => (
        <NavLink key={path} to={path} className="pill-nav-item">
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
