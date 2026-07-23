import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { canAccessRoute } from '../auth/roleRouting';

const NAV_ITEMS = [
  { path: '/command-center', label: 'Command Center', icon: GridIcon },
  { path: '/overview', label: 'Overview', icon: ChartIcon },
  { path: '/crime-trends', label: 'Crime Trends', icon: TrendUpIcon },
  { path: '/demographics', label: 'Demographics', icon: PeopleIcon },
  { path: '/investigation-network', label: 'Investigation Network', icon: LinkageIcon },
  { path: '/judicial-units', label: 'Judicial & Units', icon: GavelIcon },
  { path: '/case-explorer', label: 'Case Explorer', icon: FolderIcon },
  { path: '/network', label: 'Network / Link Analysis', icon: NetworkIcon },
  { path: '/sociological', label: 'Sociological & Predictive', icon: TrendIcon },
  { path: '/admin', label: 'Admin / Audit', icon: ShieldIcon },
];

export function Rail() {
  const { roles } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => canAccessRoute(roles, item.path));

  return (
    <nav className="rail" aria-label="Primary">
      {visibleItems.map(({ path, label, icon: Icon }) => (
        <NavLink key={path} to={path} className="rail-item">
          <Icon />
          <span className="rail-tip">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.2" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.2" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 17V9M10 17V3M17 17v-6" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 5.5h5l1.5 2H17v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" strokeLinejoin="round" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="5" cy="5" r="2" />
      <circle cx="15" cy="5" r="2" />
      <circle cx="10" cy="15" r="2" />
      <path d="M6.6 6.2 8.7 13M13.4 6.2 11.3 13M7 5h6" strokeLinecap="round" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 13.5 8 8l3.5 3.5L17 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 6H17v4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 15 8 9l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="7" cy="6.5" r="2.3" />
      <path d="M2.5 16c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5" strokeLinecap="round" />
      <circle cx="14.5" cy="7.5" r="1.8" />
      <path d="M12.7 11.7c.5-.2 1.1-.3 1.8-.3 2.1 0 3.7 1.4 3.7 3.7" strokeLinecap="round" />
    </svg>
  );
}

function LinkageIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="5" cy="10" r="2.2" />
      <circle cx="15" cy="5" r="2.2" />
      <circle cx="15" cy="15" r="2.2" />
      <path d="M7 9 13 6M7 11l6 4" strokeLinecap="round" />
    </svg>
  );
}

function GavelIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 12.5 8.5 8M11 4.5 15.5 9M9.3 6.2l4.5 4.5M2.5 17.5h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M10 2.5 17 5v5c0 4.5-3 7.5-7 8-4-.5-7-3.5-7-8V5l7-2.5z" strokeLinejoin="round" />
    </svg>
  );
}
