import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { defaultRouteForRoles } from './roleRouting';

const DEMO_PERSONAS = [
  { username: 'demo.analyst', label: 'SCRB Analyst' },
  { username: 'demo.investigator', label: 'Investigator' },
  { username: 'demo.supervisor', label: 'Station Supervisor' },
  { username: 'demo.superadmin', label: 'Super Admin' },
];

export function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [demoPending, setDemoPending] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleDemoLogin(demoUsername: string) {
    setError(null);
    setDemoPending(demoUsername);
    try {
      const response = await login(demoUsername, 'demo');
      navigate(defaultRouteForRoles(response.roles), { replace: true });
    } catch {
      setError('Demo login failed.');
    } finally {
      setDemoPending(null);
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
          <div className="login-demo">
            <p className="login-demo-title" style={{ color: '#333333' }}>
              <strong>Hackathon demo access[No Login Required ] </strong>
            </p>

            {/* Moved the error state here so demo login failures are still visible */}
            {error && <p className="login-error" role="alert">{error}</p>}

            <div className="login-demo-grid">
              {DEMO_PERSONAS.map((persona) => (
                  <button
                      key={persona.username}
                      type="button"
                      className="login-demo-btn"
                      disabled={demoPending !== null}
                      onClick={() => handleDemoLogin(persona.username)}
                  >
                    {demoPending === persona.username ? 'Logging in…' : persona.label}
                  </button>
              ))}
            </div>
          </div>
        </section>
      </main>
  );
}