import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { defaultRouteForRoles } from './roleRouting';

export function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const response = await login(username, password);
      navigate(defaultRouteForRoles(response.roles), { replace: true });
    } catch {
      setError('Incorrect username or password.');
    }
  }

  return (
    <main className="login-screen">
      <div className="login-ambient" aria-hidden="true" />
      <svg className="login-graph" viewBox="0 0 420 420" aria-hidden="true">
        <g stroke="var(--line)" strokeWidth="1">
          <line x1="60" y1="80" x2="180" y2="140" />
          <line x1="180" y1="140" x2="140" y2="260" />
          <line x1="180" y1="140" x2="320" y2="110" />
          <line x1="320" y1="110" x2="360" y2="230" />
          <line x1="140" y1="260" x2="260" y2="330" />
          <line x1="260" y1="330" x2="360" y2="230" />
          <line x1="140" y1="260" x2="60" y2="340" />
        </g>
        <g>
          <circle cx="60" cy="80" r="5" fill="var(--real)" />
          <circle cx="180" cy="140" r="7" fill="var(--real)" />
          <circle cx="320" cy="110" r="5" fill="var(--predicted)" />
          <circle cx="360" cy="230" r="6" fill="var(--predicted)" />
          <circle cx="140" cy="260" r="6" fill="var(--real)" />
          <circle cx="260" cy="330" r="5" fill="var(--predicted)" />
          <circle cx="60" cy="340" r="4" fill="var(--real)" />
        </g>
      </svg>

      <section className="login-brand">
        <div className="login-brand-inner">
          <img className="login-mark" src="/KSP-LOGO.png" alt="Karnataka State Police" />
          <p className="eyebrow">Government of Karnataka</p>
          <h1 className="login-brand-title">Crime Analytics</h1>
          <p className="login-brand-sub">
            Unified case, network, and pattern intelligence for investigators, station
            command, and policy review.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8.2" r="3.6" />
              <path d="M4.5 20c1.4-4 4-6 7.5-6s6.1 2 7.5 6" />
            </svg>
            <label className="sr-only" htmlFor="username">Username</label>
            <input
              id="username"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="login-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="5" y="10.5" width="14" height="9" rx="2.2" />
              <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
            </svg>
            <label className="sr-only" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="login-options">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <a className="login-forgot" href="#" onClick={(e) => e.preventDefault()}>
              Forgot Password?
            </a>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit">Log in</button>
          <p className="login-footnote mono">Authorized personnel only. All access is logged.</p>
        </form>
      </section>
    </main>
  );
}
