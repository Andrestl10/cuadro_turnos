import { useEffect, useState } from 'react';
import type { Doctor } from '../types';
import { useStore } from '../store/StoreContext';
import { X, Sun, Moon } from 'lucide-react';

interface Props {
  doctor: Doctor;
  onClose: () => void;
}

const CheckRow = ({ id, checked, onChange, label, sublabel }: any) => (
  <label htmlFor={id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: checked ? 'rgba(79,70,229,0.07)' : 'transparent', border: checked ? '1px solid rgba(79,70,229,0.25)' : '1px solid transparent', transition: 'all 0.15s' }}>
    <input type="checkbox" id={id} checked={!!checked} onChange={onChange} style={{ marginTop: '2px', accentColor: 'var(--primary)' }} />
    <div>
      <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{label}</div>
      {sublabel && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sublabel}</div>}
    </div>
  </label>
);

export const EditDoctorModal = ({ doctor, onClose }: Props) => {
  const { dispatch } = useStore();
  const [formData, setFormData] = useState<Doctor>(doctor);

  useEffect(() => {
    setFormData(doctor);
  }, [doctor]);

  const handleChange = (field: keyof Doctor, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    dispatch({ type: 'UPDATE_DOCTOR', payload: formData });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto', width: '460px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: formData.color }} />
            <h2 style={{ margin: 0 }}>Editar Médico</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Basic info */}
        <div className="form-group">
          <label>Nombre</label>
          <input type="text" className="form-control" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Turnos Max / Mes</label>
            <input type="number" className="form-control" value={formData.maxMonthlyShifts} onChange={e => handleChange('maxMonthlyShifts', Number(e.target.value))} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Horas / Turno</label>
            <input type="number" className="form-control" value={formData.shiftHours} onChange={e => handleChange('shiftHours', Number(e.target.value))} />
          </div>
        </div>

        {/* Shift type buttons */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '8px', color: 'var(--text-main)' }}>Tipo de Turno</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {([
              { val: '', label: 'Rotativo', icon: null },
              { val: 'day', label: 'Solo Día', icon: <Sun size={14} /> },
              { val: 'night', label: 'Solo Noche', icon: <Moon size={14} /> },
            ] as const).map(({ val, label, icon }) => {
              const active = (formData.fixedShiftType ?? '') === val;
              return (
                <button
                  key={val}
                  onClick={() => handleChange('fixedShiftType', val === '' ? undefined : val)}
                  style={{ flex: 1, padding: '8px 4px', border: active ? '2px solid var(--primary)' : '1px solid #D1D5DB', borderRadius: '8px', background: active ? 'rgba(79,70,229,0.08)' : 'white', cursor: 'pointer', fontWeight: active ? 600 : 400, color: active ? 'var(--primary)' : 'var(--text-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '0.8rem', transition: 'all 0.15s' }}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day availability */}
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '8px', color: 'var(--text-main)' }}>Disponibilidad de Días</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <CheckRow
              id="noWeekends"
              checked={formData.noWeekends}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('noWeekends', e.target.checked)}
              label="No trabaja fines de semana"
              sublabel="Solo se le asignan turnos de Lunes a Viernes"
            />
            <CheckRow
              id="onlyWeekends"
              checked={formData.onlyWeekends}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('onlyWeekends', e.target.checked)}
              label="Solo fines de semana"
              sublabel="Solo se le asignan turnos en Sábado y Domingo"
            />
            <CheckRow
              id="onlyEvenDays"
              checked={formData.onlyEvenDays}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('onlyEvenDays', e.target.checked)}
              label="Solo días pares"
              sublabel="Solo se le asignan turnos en días 2, 4, 6, 8…"
            />
            <CheckRow
              id="onlyOddDays"
              checked={formData.onlyOddDays}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('onlyOddDays', e.target.checked)}
              label="Solo días impares"
              sublabel="Solo se le asignan turnos en días 1, 3, 5, 7…"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className="btn btn-primary" onClick={handleSave}>Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
};
