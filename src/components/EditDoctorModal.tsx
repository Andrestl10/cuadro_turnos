import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useStore } from '../store/StoreContext';
import type { VersionedDoctor } from '../store/types';
import type { Doctor } from '../types';
import {
  parseBlackoutLines,
  validateDoctorProfileConstraints
} from '../utils/doctorProfileValidation';
import { X, Sun, Moon } from 'lucide-react';

interface Props {
  doctor: VersionedDoctor;
  onClose: () => void;
}

const DATE_LINE = /^\d{4}-\d{2}-\d{2}$/;

type CheckRowProps = {
  id: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label: string;
  sublabel?: string;
};

const CheckRow = ({
  id,
  checked,
  onChange,
  label,
  sublabel
}: CheckRowProps) => (
  <label
    htmlFor={id}
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      padding: '8px 10px',
      borderRadius: '8px',
      cursor: 'pointer',
      background: checked ? 'rgba(79,70,229,0.07)' : 'transparent',
      border: checked ? '1px solid rgba(79,70,229,0.25)' : '1px solid transparent',
      transition: 'all 0.15s'
    }}
  >
    <input
      type="checkbox"
      id={id}
      checked={!!checked}
      onChange={onChange}
      style={{ marginTop: '2px', accentColor: 'var(--primary)' }}
    />
    <div>
      <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{label}</div>
      {sublabel && (
        <div
          style={{
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            marginTop: '2px'
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  </label>
);

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

export const EditDoctorModal = ({ doctor, onClose }: Props) => {
  const { dispatch } = useStore();
  const [formData, setFormData] = useState<VersionedDoctor>(() => ({ ...doctor }));
  const [blackoutText, setBlackoutText] = useState(
    () => doctor.blackoutDates?.join('\n') ?? ''
  );
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  const clearSaveErrors = () => setSaveErrors([]);

  const handleChange = <K extends keyof Doctor>(field: K, value: Doctor[K]) => {
    clearSaveErrors();
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    clearSaveErrors();
    const rawLines = parseBlackoutLines(blackoutText);
    const invalidLines = rawLines.filter((l) => !DATE_LINE.test(l));
    if (invalidLines.length > 0) {
      setSaveErrors([
        'Cada línea en "No disponible" debe ser YYYY-MM-DD. Revisa: ' +
          invalidLines.slice(0, 3).join(', ') +
          (invalidLines.length > 3 ? '…' : '')
      ]);
      return;
    }

    const toSave: VersionedDoctor = {
      ...formData,
      blackoutDates: rawLines.length > 0 ? rawLines : undefined
    };

    const profileIssues = validateDoctorProfileConstraints(toSave);
    if (profileIssues.length > 0) {
      setSaveErrors(profileIssues);
      return;
    }

    dispatch({ type: 'UPDATE_DOCTOR', payload: toSave });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto', width: '460px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: formData.color
              }}
            />
            <h2 style={{ margin: 0 }}>Editar Médico</h2>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="form-group">
          <label>Nombre</label>
          <input
            type="text"
            className="form-control"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Turnos max / mes</label>
            <input
              type="number"
              min={1}
              className="form-control"
              value={formData.maxMonthlyShifts}
              onChange={(e) =>
                handleChange(
                  'maxMonthlyShifts',
                  clampInt(Number(e.target.value), 1, 62)
                )
              }
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Horas / turno</label>
            <input
              type="number"
              min={1}
              max={24}
              className="form-control"
              value={formData.shiftHours}
              onChange={(e) =>
                handleChange('shiftHours', clampInt(Number(e.target.value), 1, 24))
              }
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Noches max</label>
            <input
              type="number"
              min={0}
              className="form-control"
              value={formData.maxMonthlyNights ?? ''}
              placeholder="Sin límite"
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') {
                  handleChange('maxMonthlyNights', undefined);
                  return;
                }
                handleChange('maxMonthlyNights', clampInt(Number(v), 0, 62));
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 500,
              marginBottom: '8px',
              color: 'var(--text-main)'
            }}
          >
            Tipo de turno
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(
              [
                { val: '', label: 'Rotativo', icon: null },
                { val: 'day', label: 'Solo día', icon: <Sun size={14} /> },
                { val: 'night', label: 'Solo noche', icon: <Moon size={14} /> }
              ] as const
            ).map(({ val, label, icon }) => {
              const active = (formData.fixedShiftType ?? '') === val;
              return (
                <button
                  key={val || 'rot'}
                  type="button"
                  onClick={() => {
                    clearSaveErrors();
                    handleChange('fixedShiftType', val === '' ? undefined : val);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    border: active ? '2px solid var(--primary)' : '1px solid #D1D5DB',
                    borderRadius: '8px',
                    background: active ? 'rgba(79,70,229,0.08)' : 'white',
                    cursor: 'pointer',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--primary)' : 'var(--text-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    transition: 'all 0.15s'
                  }}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>
          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              margin: '8px 0 0'
            }}
          >
            Rotativo: puede día o noche según reglas. Solo día/noche limita el tipo de turno
            (autocompletar e IA lo respetan igual que la validación del calendario).
          </p>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 500,
              marginBottom: '8px',
              color: 'var(--text-main)'
            }}
          >
            Disponibilidad por calendario
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <CheckRow
              id="noWeekends"
              checked={formData.noWeekends}
              onChange={(e) => {
                const v = e.target.checked;
                clearSaveErrors();
                setFormData((prev) => ({
                  ...prev,
                  noWeekends: v,
                  ...(v ? { onlyWeekends: false } : {})
                }));
              }}
              label="No trabaja fines de semana"
              sublabel="Solo Lunes a Viernes (incompatible con “Solo fines de semana”)"
            />
            <CheckRow
              id="onlyWeekends"
              checked={!!formData.onlyWeekends}
              onChange={(e) => {
                const v = e.target.checked;
                clearSaveErrors();
                setFormData((prev) => ({
                  ...prev,
                  onlyWeekends: v ? true : undefined,
                  ...(v ? { noWeekends: false } : {})
                }));
              }}
              label="Solo fines de semana"
              sublabel="Solo sábados y domingos"
            />
            <CheckRow
              id="onlyEvenDays"
              checked={!!formData.onlyEvenDays}
              onChange={(e) => {
                const v = e.target.checked;
                clearSaveErrors();
                setFormData((prev) => ({
                  ...prev,
                  onlyEvenDays: v ? true : undefined,
                  ...(v ? { onlyOddDays: undefined } : {})
                }));
              }}
              label="Solo días pares del mes"
              sublabel="Días 2, 4, 6… del mes (no confundir con martes/jueves)"
            />
            <CheckRow
              id="onlyOddDays"
              checked={!!formData.onlyOddDays}
              onChange={(e) => {
                const v = e.target.checked;
                clearSaveErrors();
                setFormData((prev) => ({
                  ...prev,
                  onlyOddDays: v ? true : undefined,
                  ...(v ? { onlyEvenDays: undefined } : {})
                }));
              }}
              label="Solo días impares del mes"
              sublabel="Días 1, 3, 5… del mes"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label>Días no disponibles (opcional)</label>
          <textarea
            className="form-control"
            rows={4}
            placeholder={'Una fecha por línea, formato YYYY-MM-DD\nEj: 2026-05-01'}
            value={blackoutText}
            onChange={(e) => {
              clearSaveErrors();
              setBlackoutText(e.target.value);
            }}
            style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
          />
          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              margin: '6px 0 0'
            }}
          >
            Autocompletar, validación del calendario e IA tratan estas fechas como bloqueadas
            para este médico.
          </p>
        </div>

        {saveErrors.length > 0 && (
          <div
            role="alert"
            style={{
              marginBottom: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.35)',
              fontSize: '0.82rem',
              color: '#b91c1c'
            }}
          >
            <strong>Revisa antes de guardar:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
              {saveErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};
