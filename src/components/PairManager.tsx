import { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { selectAllDoctors, selectDoctorById } from '../store/selectors';
import type { VersionedDoctor } from '../store/types';
import { Link2, Link2Off, Users } from 'lucide-react';

export const PairManager = () => {
  const { state, dispatch } = useStore();
  const [docA, setDocA] = useState('');
  const [docB, setDocB] = useState('');

  const doctors = selectAllDoctors(state);

  const pairs: { a: VersionedDoctor; b: VersionedDoctor }[] = [];
  const seen = new Set<string>();
  for (const doc of doctors) {
    if (doc.partnerId && !seen.has(doc.id)) {
      const partner = selectDoctorById(state, doc.partnerId);
      if (partner) {
        pairs.push({ a: doc, b: partner });
        seen.add(doc.id);
        seen.add(partner.id);
      }
    }
  }

  const handleLink = () => {
    if (!docA || !docB || docA === docB) return;
    const dA = selectDoctorById(state, docA);
    const dB = selectDoctorById(state, docB);
    if (!dA || !dB) return;
    dispatch({ type: 'UPDATE_DOCTOR', payload: { ...dA, partnerId: docB } });
    dispatch({ type: 'UPDATE_DOCTOR', payload: { ...dB, partnerId: docA } });
    setDocA('');
    setDocB('');
  };

  const handleUnlink = (a: VersionedDoctor, b: VersionedDoctor) => {
    dispatch({ type: 'UPDATE_DOCTOR', payload: { ...a, partnerId: undefined } });
    dispatch({ type: 'UPDATE_DOCTOR', payload: { ...b, partnerId: undefined } });
  };

  const availableDocs = doctors.filter(d => !d.partnerId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Users size={16} color="var(--primary)" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Parejas de Medio Turno</span>
      </div>

      {/* Existing pairs */}
      {pairs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pairs.map(({ a, b }) => (
            <div key={a.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              border: '1px solid rgba(79,70,229,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: a.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
              </div>
              <Link2 size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: b.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
              </div>
              <button
                title="Desemparejar"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                onClick={() => handleUnlink(a, b)}
              >
                <Link2Off size={15} color="var(--danger)" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pair creation form */}
      {availableDocs.length >= 2 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(79,70,229,0.05)', borderRadius: '8px', border: '1px dashed rgba(79,70,229,0.3)' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>CREAR NUEVA PAREJA</label>
          <select className="form-control" value={docA} onChange={e => setDocA(e.target.value)} style={{ fontSize: '0.8rem', padding: '6px 8px' }}>
            <option value="">Médico mañana…</option>
            {availableDocs.filter(d => d.id !== docB).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select className="form-control" value={docB} onChange={e => setDocB(e.target.value)} style={{ fontSize: '0.8rem', padding: '6px 8px' }}>
            <option value="">Médico tarde…</option>
            {availableDocs.filter(d => d.id !== docA).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '7px' }}
            onClick={handleLink}
            disabled={!docA || !docB}
          >
            <Link2 size={14} /> Emparejar
          </button>
        </div>
      ) : availableDocs.length < 2 && pairs.length === 0 ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Agrega al menos 2 médicos sin pareja para crear una.</p>
      ) : null}
    </div>
  );
};
