import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from '../design-system/ThemeToggle';

interface HeaderProps {
  title: string;
  children?: ReactNode;
}

export function Header({ title, children }: HeaderProps) {
  const { username, roles } = useAuth();

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
            <span className="rank">{roles.join(', ')}</span>
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
