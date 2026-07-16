import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useMe } from '../api/meApi';
import { ThemeToggle } from '../design-system/ThemeToggle';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  const { token, username, roles } = useAuth();
  const { data: me } = useMe(token);
  const rankAndUnit = me?.rank && me?.unit ? `${me.rank} · ${me.unit}` : roles.join(', ');

  return (
    <header className="header">
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
