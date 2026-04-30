import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { CalendarDays, Mail, Lock, LogIn, UserPlus, ArrowRight } from 'lucide-react';

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

  const title = useMemo(() => (mode === 'login' ? 'Bienvenido de nuevo' : 'Crear nueva cuenta'), [mode]);
  const subtitle = useMemo(() => (mode === 'login' ? 'Ingresa a tu panel de gestión de turnos' : 'Únete para gestionar tus turnos médicos'), [mode]);
  const submitText = useMemo(() => {
    if (submitting) return 'Procesando…';
    return mode === 'login' ? 'Iniciar sesión' : 'Registrarme';
  }, [mode, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      setError('Por favor, completa todos los campos.');
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
      const msg = err instanceof Error ? err.message : 'Error de autenticación.';
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
        padding: 16,
        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background blobs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(79,70,229,0) 70%)', borderRadius: '50%', filter: 'blur(40px)', animation: 'float 10s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0) 70%)', borderRadius: '50%', filter: 'blur(40px)', animation: 'float 12s ease-in-out infinite reverse' }} />

      <style>
        {`
          @keyframes float {
            0% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0, 0) scale(1); }
          }
          .auth-input-group {
            position: relative;
            margin-bottom: 16px;
          }
          .auth-input-group .icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #9CA3AF;
            transition: color 0.3s;
            pointer-events: none;
          }
          .auth-input:focus ~ .icon, .auth-input:not(:placeholder-shown) ~ .icon {
            color: var(--primary);
          }
          .auth-input {
            width: 100%;
            padding: 14px 14px 14px 44px;
            border: 2px solid transparent;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.8);
            font-size: 1rem;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.02) inset;
          }
          .auth-input:focus {
            outline: none;
            border-color: var(--primary);
            background: #ffffff;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
          }
          .auth-card {
            width: 440px;
            max-width: 100%;
            padding: 40px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255,255,255,0.5) inset;
            border-radius: 24px;
            position: relative;
            z-index: 10;
            display: flex;
            flex-direction: column;
            gap: 8px;
            animation: popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .btn-submit {
            width: 100%;
            padding: 14px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--primary) 0%, #6366F1 100%);
            color: white;
            font-size: 1.05rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
            margin-top: 10px;
          }
          .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(79, 70, 229, 0.5);
            background: linear-gradient(135deg, #4338CA 0%, var(--primary) 100%);
          }
          .btn-submit:active {
            transform: translateY(0);
          }
          .mode-switch {
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 0.9rem;
            cursor: pointer;
            margin-top: 24px;
            transition: color 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }
          .mode-switch:hover {
            color: var(--primary);
            text-decoration: underline;
          }
        `}
      </style>

      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: 20, 
            background: 'linear-gradient(135deg, var(--primary) 0%, #818CF8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
            transform: 'rotate(-5deg)',
            transition: 'transform 0.3s ease'
          }} onMouseOver={e => e.currentTarget.style.transform = 'rotate(0deg)'} onMouseOut={e => e.currentTarget.style.transform = 'rotate(-5deg)'}>
            <CalendarDays size={32} color="white" />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>{title}</h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem', marginTop: 8 }}>{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="auth-input-group">
            <input
              id="email"
              type="email"
              className="auth-input"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={submitting}
              required
            />
            <Mail className="icon" size={20} />
          </div>

          <div className="auth-input-group">
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={submitting}
              required
            />
            <Lock className="icon" size={20} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', borderLeft: '4px solid #EF4444', borderRadius: 8, color: '#991B1B', fontSize: '0.85rem', marginBottom: 16, animation: 'slideIn 0.3s ease' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={submitting}>
            {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
            {submitText}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="mode-switch"
            onClick={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
            disabled={submitting}
          >
            {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            <ArrowRight size={16} />
          </button>
        </div>

        <p style={{ marginTop: 24, fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
          El rol de administrador se asigna configurando <br/><code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: 4, color: '#4B5563' }}>VITE_ADMIN_EMAILS</code> en el archivo <code>.env</code>.
        </p>
      </div>
    </div>
  );
}

