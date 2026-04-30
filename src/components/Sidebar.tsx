import { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { useDraggable } from '@dnd-kit/core';
import { validateShifts } from '../utils/validation';
import { AlertCircle, AlertTriangle, UserPlus, Trash2, Pencil, Link2, Calendar } from 'lucide-react';
import { selectAllDoctors, selectAllShifts, selectDoctorById } from '../store/selectors';
import { MiniCalendar } from './MiniCalendar';
import { EditDoctorModal } from './EditDoctorModal';
import { PairManager } from './PairManager';
import type { VersionedDoctor } from '../store/types';

const COLOR_PALETTE = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', 
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', 
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
];
const DraggableDoctor = ({
  doctor,
  onEdit
}: {
  doctor: VersionedDoctor;
  onEdit: (doc: VersionedDoctor) => void;
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const { state, dispatch } = useStore();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `doc-${doctor.id}`,
    data: { doctor }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
  } : undefined;

  const partnerName = doctor.partnerId ? selectDoctorById(state, doctor.partnerId)?.name : undefined;

  return (
    <div ref={setNodeRef} style={style} className="doctor-card-container">
    <div className="doctor-card">
      <div className="doctor-info" {...listeners} {...attributes} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'grab' }}>
        <div className="color-dot" style={{ backgroundColor: doctor.color }}></div>
        <span>{doctor.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {doctor.fixedShiftType && <span style={{ fontSize: '0.6rem', background: '#E5E7EB', padding: '2px 4px', borderRadius: '4px' }}>Fijo: {doctor.fixedShiftType === 'day' ? 'Día' : 'Noche'}</span>}
        {doctor.noWeekends && <span style={{ fontSize: '0.6rem', background: '#FEE2E2', color: '#991B1B', padding: '2px 4px', borderRadius: '4px' }}>L-V</span>}
        {doctor.partnerId && (
          <span title={`Comparte turno con: ${partnerName}`}
            style={{ fontSize: '0.6rem', background: '#EDE9FE', color: '#5B21B6', padding: '2px 4px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Link2 size={9} /> Par
          </span>
        )}

        <button
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
          onClick={(e) => { e.stopPropagation(); onEdit(doctor); }}
          title="Editar médico"
        >
          <Pencil size={16} color="var(--text-muted)" />
        </button>
        <button
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
          onClick={(e) => { e.stopPropagation(); setShowCalendar(!showCalendar); }}
          title="Disponibilidad"
        >
          <Calendar size={16} color={showCalendar ? "var(--primary)" : "var(--text-muted)"} />
        </button>
        <button
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_DOCTOR', payload: doctor.id }); }}
          title="Eliminar médico"
        >
          <Trash2 size={16} color="var(--danger)" />
        </button>
      </div>
    </div>
    {showCalendar && (
      <div className="calendar-popover" style={{ animation: 'slideDown 0.2s ease-out' }}>
        <MiniCalendar doctor={doctor} />
      </div>
    )}
    </div>
  );
};

export const Sidebar = () => {
  const { state, dispatch } = useStore();
  const allDoctors = selectAllDoctors(state);
  const allShifts = selectAllShifts(state);
  
  const validationResults = validateShifts(allShifts, allDoctors);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocColor, setNewDocColor] = useState(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
  const [maxShifts, setMaxShifts] = useState(15);
  const [maxNights, setMaxNights] = useState(4);
  const [shiftHours, setShiftHours] = useState(12);
  const [activeTab, setActiveTab] = useState<'doctors' | 'pairs' | 'stats'>('doctors');
  const [editingDoctor, setEditingDoctor] = useState<VersionedDoctor | null>(null);

  const stats = allDoctors.map(doc => {
    const docShifts = allShifts.filter(s => s.doctorId === doc.id);
    return {
      ...doc,
      dayCount: docShifts.filter(s => s.type === 'day').length,
      nightCount: docShifts.filter(s => s.type === 'night').length,
      total: docShifts.length,
      totalHours: docShifts.length * doc.shiftHours
    };
  }).sort((a, b) => b.total - a.total);

  const handleAddDoctor = () => {
    if (newDocName.trim()) {
      dispatch({
        type: 'ADD_DOCTOR', payload: {
          name: newDocName, color: newDocColor, isFixed: false, fixedDays: [], maxMonthlyShifts: maxShifts, maxMonthlyNights: maxNights, shiftHours: shiftHours,
          noWeekends: false, blackoutDates: []
        }
      });
      setNewDocName('');
      setNewDocColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
      setMaxShifts(15);
      setMaxNights(4);
      setShiftHours(12);
      setShowAddForm(false);
    }
  };

  return (
    <div className="sidebar glass">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Resumen</h2>
        <button className="btn-icon" onClick={() => setShowAddForm(!showAddForm)} title="Añadir Médico">
          <UserPlus size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '8px' }}>
        <button
          style={{ flex: 1, padding: '7px 4px', border: 'none', background: activeTab === 'doctors' ? 'var(--primary)' : 'transparent', color: activeTab === 'doctors' ? 'white' : 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s', fontSize: '0.8rem' }}
          onClick={() => setActiveTab('doctors')}
        >
          Plantilla
        </button>
        <button
          style={{ flex: 1, padding: '7px 4px', border: 'none', background: activeTab === 'pairs' ? 'var(--primary)' : 'transparent', color: activeTab === 'pairs' ? 'white' : 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s', fontSize: '0.8rem' }}
          onClick={() => setActiveTab('pairs')}
        >
          Parejas
        </button>
        <button
          style={{ flex: 1, padding: '7px 4px', border: 'none', background: activeTab === 'stats' ? 'var(--primary)' : 'transparent', color: activeTab === 'stats' ? 'white' : 'var(--text-main)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s', fontSize: '0.8rem' }}
          onClick={() => setActiveTab('stats')}
        >
          Estadísticas
        </button>
      </div>

      {showAddForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Nombre del Médico"
            value={newDocName}
            onChange={e => setNewDocName(e.target.value)}
          />
          <div className="form-group" style={{ marginBottom: '4px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Color</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {COLOR_PALETTE.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewDocColor(color)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: newDocColor === color ? '2px solid var(--primary)' : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: newDocColor === color ? '0 0 0 2px white inset' : 'none'
                  }}
                  title={color}
                />
              ))}
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', border: '2px solid transparent' }} title="Color personalizado">
                <input type="color" value={newDocColor} onChange={(e) => setNewDocColor(e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Turnos Max / Mes</label>
              <input
                type="number"
                className="form-control"
                value={maxShifts}
                onChange={e => setMaxShifts(Number(e.target.value))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Horas / Turno</label>
              <input
                type="number"
                className="form-control"
                value={shiftHours}
                onChange={e => setShiftHours(Number(e.target.value))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Noches Max</label>
              <input
                type="number"
                className="form-control"
                value={maxNights}
                onChange={e => setMaxNights(Number(e.target.value))}
              />
            </div>
          </div>
          <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={handleAddDoctor}>Agregar</button>
        </div>
      )}

      {activeTab === 'doctors' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {allDoctors.map(doc => (
            <DraggableDoctor key={doc.id} doctor={doc} onEdit={setEditingDoctor} />
          ))}
        </div>
      ) : activeTab === 'pairs' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          <PairManager />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stats.map(stat => (
            <div key={stat.id} style={{ padding: '12px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div className="color-dot" style={{ backgroundColor: stat.color }}></div>
                <span style={{ fontWeight: 500 }}>{stat.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: '#E5E7EB', padding: '2px 6px', borderRadius: '10px' }}>
                  {stat.shiftHours}h / turno
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>Día: <strong>{stat.dayCount}</strong></span>
                <span>
                  Noche: <strong style={{ color: stat.maxMonthlyNights && stat.nightCount > stat.maxMonthlyNights ? 'var(--danger)' : 'inherit' }}>
                    {stat.nightCount} {stat.maxMonthlyNights ? `/ ${stat.maxMonthlyNights}` : ''}
                  </strong>
                </span>
                <span>
                  Total: <strong style={{ color: stat.total > stat.maxMonthlyShifts ? 'var(--danger)' : 'var(--primary)' }}>
                    {stat.total} / {stat.maxMonthlyShifts}
                  </strong>
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                Horas Totales: <strong>{stat.totalHours}h</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '12px' }}>
        <h3 style={{ fontSize: '1rem', margin: '0 0 8px 0' }}>Alertas</h3>
        <div className="alerts-container">
          {validationResults.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Todo en orden.</p>
          ) : (
            validationResults.map((res, i) => (
              <div key={i} className={`alert alert-${res.type}`}>
                {res.type === 'error' ? <AlertCircle size={16} /> : <AlertTriangle size={16} />}
                <span>{res.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {editingDoctor && (
        <EditDoctorModal
          key={editingDoctor.id}
          doctor={editingDoctor}
          onClose={() => setEditingDoctor(null)}
        />
      )}
    </div>
  );
};
