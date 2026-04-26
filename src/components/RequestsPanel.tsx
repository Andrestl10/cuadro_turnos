import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { firebaseDb } from '../firebase';
import { createRequest, loadRequests, type ChangeRequest, updateRequestStatus, toMonthKey } from '../utils/rtdb';
import { useStore } from '../store/StoreContext';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function RequestsPanel() {
  const { user, profile } = useAuth();
  const { state } = useStore();
  const monthKey = useMemo(() => toMonthKey(state.currentMonth), [state.currentMonth]);

  const [items, setItems] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dateStr, setDateStr] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});

  const role = profile?.role ?? 'doctor';

  const visibleItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
    if (role === 'admin') return sorted;
    const uid = user?.uid;
    if (!uid) return [];
    return sorted.filter((r) => r.uid === uid);
  }, [items, role, user?.uid]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await loadRequests(firebaseDb, monthKey);
      setItems(data);
    } catch (err) {
      console.warn('loadRequests failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const submit = async () => {
    setError(null);
    if (!user || !profile) {
      setError('Debes iniciar sesión.');
      return;
    }
    if (!isNonEmptyString(message)) {
      setError('Escribe un mensaje.');
      return;
    }
    try {
      await createRequest(firebaseDb, monthKey, {
        uid: user.uid,
        email: profile.email,
        message: message.trim(),
        dateStr: isNonEmptyString(dateStr) ? dateStr : undefined
      });
      setMessage('');
      setDateStr('');
      await refresh();
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : 'Error creando solicitud.';
      setError(msg);
    }
  };

  const adminUpdate = async (id: string, status: 'reviewed' | 'approved' | 'rejected') => {
    if (role !== 'admin') return;
    try {
      await updateRequestStatus(firebaseDb, monthKey, id, { status, adminNote: adminNote[id] });
      await refresh();
    } catch (err) {
      console.warn('updateRequestStatus failed', err);
    }
  };

  return (
    <div className="glass" style={{ padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Solicitudes / Comentarios</h3>
        <button className="btn" style={{ background: 'white' }} onClick={refresh} disabled={loading}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {role !== 'admin' && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="date"
              className="form-control"
              style={{ maxWidth: 190 }}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Ej: Solicito cambio de turno con Dr. X…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className="btn btn-primary" onClick={submit} style={{ justifyContent: 'center' }}>
              Enviar
            </button>
          </div>
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Solo tú y el administrador podrán ver tus solicitudes.
          </p>
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflow: 'auto' }}>
        {visibleItems.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {role === 'admin' ? 'No hay solicitudes este mes.' : 'Aún no has enviado solicitudes este mes.'}
          </p>
        ) : (
          visibleItems.map((r) => (
            <div key={r.id} style={{ background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.email}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(r.createdAt).toLocaleString()} {r.dateStr ? `· Fecha: ${r.dateStr}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', background: '#E5E7EB', padding: '2px 8px', borderRadius: 999 }}>
                  {r.status}
                </div>
              </div>

              <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{r.message}</div>

              {r.adminNote && (
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <strong>Nota admin:</strong> {r.adminNote}
                </div>
              )}

              {role === 'admin' && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nota para el médico (opcional)"
                    style={{ flex: 1, minWidth: 220 }}
                    value={adminNote[r.id] ?? ''}
                    onChange={(e) => setAdminNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  />
                  <button className="btn" style={{ background: 'white' }} onClick={() => adminUpdate(r.id, 'reviewed')}>
                    Revisado
                  </button>
                  <button className="btn" style={{ background: 'white' }} onClick={() => adminUpdate(r.id, 'approved')}>
                    Aprobar
                  </button>
                  <button className="btn btn-danger" onClick={() => adminUpdate(r.id, 'rejected')}>
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

