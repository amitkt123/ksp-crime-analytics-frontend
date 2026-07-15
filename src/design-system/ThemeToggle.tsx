import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ksp-theme';

function getInitialTheme(): 'light' | 'dark' {
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <button
      className="theme-toggle"
      aria-label="Toggle dark mode"
      aria-pressed={theme === 'dark'}
      onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
    >
      <span className="knob" />
    </button>
  );
}
