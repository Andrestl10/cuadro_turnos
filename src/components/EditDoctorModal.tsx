import { useEffect, useState } from 'react';
import type { Doctor } from '../types';
import { useStore } from '../store/StoreContext';
import { X } from 'lucide-react';

interface Props {
  doctor: Doctor;
  onClose: () => void;
}

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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2>Editar Médico</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="form-group">
          <label>Nombre</label>
          <input type="text" className="form-control" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Turnos Max / Mes</label>
            <input type="number" className="form-control" value={formData.maxMonthlyShifts} onChange={e => handleChange('maxMonthlyShifts', Number(e.target.value))} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Horas / Turno</label>
            <input type="number" className="form-control" value={formData.shiftHours} onChange={e => handleChange('shiftHours', Number(e.target.value))} />
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" id="noWeekends" checked={formData.noWeekends || false} onChange={e => handleChange('noWeekends', e.target.checked)} />
          <label htmlFor="noWeekends" style={{ margin: 0, cursor: 'pointer' }}>No trabaja fines de semana</label>
        </div>

        <div className="form-group">
          <label>Turno Fijo</label>
          <select className="form-control" value={formData.fixedShiftType || ''} onChange={e => handleChange('fixedShiftType', e.target.value === '' ? undefined : e.target.value)}>
            <option value="">Cualquiera (Rotativo)</option>
            <option value="day">Solo Día</option>
            <option value="night">Solo Noche</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className="btn btn-primary" onClick={handleSave}>Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
};
