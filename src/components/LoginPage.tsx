import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { LogIn, Stethoscope, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = login(username, password);
      if (!result.success) {
        setError(result.error || 'Error de autenticación');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 30px rgba(79,70,229,0.35)',
          }}>
            <Stethoscope size={36} color="white" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#1F2937' }}>Cuadro de Turnos</h1>
          <p style={{ margin: '6px 0 0', color: '#6B7280', fontSize: '0.95rem' }}>Sistema de Gestión Médica</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 8px 32px rgba(31,38,135,0.12)',
          border: '1px solid rgba(255,255,255,0.6)',
        }}>
          <h2 style={{ margin: '0 0 24px', fontSize: '1.2rem', fontWeight: 600, color: '#1F2937' }}>Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                Usuario
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                required
                autoFocus
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #D1D5DB', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#4F46E5'}
                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  required
                  style={{ width: '100%', padding: '11px 44px 11px 14px', border: '1px solid #D1D5DB', borderRadius: '10px', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#4F46E5'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '12px', background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 14px rgba(79,70,229,0.35)', fontFamily: 'inherit' }}
            >
              {loading ? 'Verificando...' : <><LogIn size={18} /> Ingresar</>}
            </button>
          </form>
        </div>

        {/* Role hint cards */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { icon: <ShieldCheck size={16} color="#4F46E5" />, title: 'Administrador', user: 'admin', pass: 'admin123', bg: '#EDE9FE', border: '#C4B5FD' },
            { icon: <User size={16} color="#059669" />, title: 'Médico', user: 'doctor', pass: 'doctor123', bg: '#D1FAE5', border: '#6EE7B7' },
          ].map(hint => (
            <div key={hint.user} style={{ flex: 1, padding: '10px 12px', background: hint.bg, borderRadius: '12px', border: `1px solid ${hint.border}`, cursor: 'pointer' }}
              onClick={() => { setUsername(hint.user); setPassword(hint.pass); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                {hint.icon}
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1F2937' }}>{hint.title}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                <div>👤 {hint.user}</div>
                <div>🔑 {hint.pass}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
