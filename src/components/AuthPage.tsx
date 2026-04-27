import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'), [mode]);
  const submitText = useMemo(() => {
    if (submitting) return 'Procesando…';
    return mode === 'login' ? 'Entrar' : 'Registrarme';
  }, [mode, submitting]);

  const handleSubmit = async () => {
    setError(null);
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      setError('Email y contraseña son obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error autenticando.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div className="glass" style={{ width: 420, maxWidth: '100%', padding: 24 }}>
        <h1 style={{ marginBottom: 8 }}>{title}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          Acceso para administradores y médicos.
        </p>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            disabled={submitting}
          />
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginTop: 8 }}>
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSubmit} disabled={submitting}>
            {submitText}
          </button>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn"
            style={{ background: 'white' }}
            onClick={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
            disabled={submitting}
          >
            {mode === 'login' ? 'Crear cuenta' : 'Ya tengo cuenta'}
          </button>
        </div>

        <p style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          El rol se asigna automáticamente. Para crear admins, configura <code>VITE_ADMIN_EMAILS</code> en el{' '}
          <code>.env</code>.
        </p>
      </div>
    </div>
  );
}

