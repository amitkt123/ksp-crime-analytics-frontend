import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { defaultRouteForRoles } from './roleRouting';

export function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      <form onSubmit={handleSubmit}>
        <h1>KSP Crime Analytics</h1>
        <label htmlFor="username">Username</label>
        <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <p role="alert">{error}</p>}
        <button type="submit">Log in</button>
      </form>
    </main>
  );
}
