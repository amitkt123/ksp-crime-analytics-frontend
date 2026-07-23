import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useMe } from '../api/meApi';
import { ThemeToggle } from '../design-system/ThemeToggle';
import { getGlobalKpiStripDemo } from '../api/demoAnalyticsData';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  const { token, username, roles } = useAuth();
  const { data: me } = useMe(token);
  const rankAndUnit = me?.rank && me?.unit ? `${me.rank} · ${me.unit}` : roles.join(', ');
  const kpi = getGlobalKpiStripDemo();

  return (
    <header className="header">
      <div className="header-top-row">
        <div className="title-block">
          <h1>{title}</h1>
        </div>
        <div className="filters">{children}</div>
        <div className="header-right">
          <ThemeToggle />
          <div className="role-chip">
            <div className="role-avatar">{initials(username)}</div>
            <div className="role-text">
              <span className="name">{username}</span>
              <span className="rank">{rankAndUnit}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="kpi-strip">
        <div className="kpi">
          <div className="val">{kpi.totalFirs.toLocaleString()}</div>
          <div className="lbl">Total FIRs (24 mo)</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.heinousPct}%</div>
          <div className="lbl">Heinous Offences</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.chargesheetRatePct}%</div>
          <div className="lbl">Chargesheet Rate</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.avgDaysToChargesheet} days</div>
          <div className="lbl">Avg. Days to Chargesheet</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.pendingInvestigation.toLocaleString()}</div>
          <div className="lbl">Pending Investigation</div>
        </div>
        <div className="kpi">
          <div className="val">{kpi.accusedArrestedPct}%</div>
          <div className="lbl">Accused Arrested</div>
        </div>
      </div>
    </header>
  );
}

function initials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(/[.\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
