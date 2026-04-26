import React from 'react';
import { useStore } from '../store/StoreContext';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, startOfWeek, endOfWeek, isWeekend } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { X } from 'lucide-react';

const EditShiftModal = ({ shift, onClose }: { shift: any, onClose: () => void }) => {
  const { state, dispatch } = useStore();
  const doc = state.doctors.find(d => d.id === shift.doctorId);
  
  const defaultStart = shift.type === 'day' ? '06:00' : '18:00';
  const defaultEndDay = (6 + (doc?.shiftHours || 12)).toString().padStart(2, '0') + ':00';
  const defaultEndNight = ((18 + (doc?.shiftHours || 12)) % 24).toString().padStart(2, '0') + ':00';
  const defaultEnd = shift.type === 'day' ? defaultEndDay : defaultEndNight;

  const [startTime, setStartTime] = React.useState(shift.customStartTime || defaultStart);
  const [endTime, setEndTime] = React.useState(shift.customEndTime || defaultEnd);

  if (!doc) return null;

  const handleSave = () => {
    dispatch({ type: 'UPDATE_SHIFT', payload: { ...shift, customStartTime: startTime, customEndTime: endTime } });
    onClose();
  };

  const handleReset = () => {
    const updated = { ...shift };
    delete updated.customStartTime;
    delete updated.customEndTime;
    dispatch({ type: 'UPDATE_SHIFT', payload: updated });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2>Ajustar Horario: {doc.name}</h2>
          <button className="btn-icon" onClick={onClose}><X size={20}/></button>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Hora de Llegada</label>
            <input type="time" className="form-control" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Hora de Salida</label>
            <input type="time" className="form-control" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Cambiar esto solo afectará a este día específico ({shift.dateStr}).
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button className="btn" style={{ background: '#E5E7EB' }} onClick={handleReset}>Restablecer</button>
          <button className="btn btn-primary" onClick={handleSave}>Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
};

const getShiftHoursText = (shift: any, doc: any) => {
  if (shift.customStartTime && shift.customEndTime) {
    return `${shift.customStartTime} - ${shift.customEndTime}`;
  }

  const hours = doc.shiftHours;
  if (shift.type === 'day') {
    const endHour = 6 + hours;
    return `06:00 - ${endHour.toString().padStart(2, '0')}:00`;
  } else {
    const endHour = (18 + hours) % 24;
    return `18:00 - ${endHour.toString().padStart(2, '0')}:00`;
  }
};

const DroppableZone = ({ id, title, type, shifts, doctors, dateStr, onEditShift }: any) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { dateStr, type }
  });
  const { dispatch } = useStore();

  return (
    <div 
      ref={setNodeRef} 
      className={`drop-zone ${type}-zone ${isOver ? 'active' : ''}`}
    >
      <div className="drop-zone-title">{title}</div>
      {(() => {
        const rendered = new Set<string>();
        return shifts.map((shift: any) => {
          if (rendered.has(shift.id)) return null;
          const doc = doctors.find((d: any) => d.id === shift.doctorId);
          if (!doc) return null;

          // Check if this doctor has a partner assigned on the same day/type
          const partnerShift = doc.partnerId
            ? shifts.find((s: any) => s.doctorId === doc.partnerId && s.dateStr === shift.dateStr && s.type === shift.type)
            : null;
          const partnerDoc = partnerShift ? doctors.find((d: any) => d.id === partnerShift.doctorId) : null;

          if (partnerShift && partnerDoc) {
            rendered.add(shift.id);
            rendered.add(partnerShift.id);
            const timeA = getShiftHoursText(shift, doc);
            const timeB = getShiftHoursText(partnerShift, partnerDoc);
            return (
              <div key={shift.id} style={{ display: 'flex', flexDirection: 'column', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', width: '100%', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                {/* Morning half */}
                <div style={{ backgroundColor: doc.color, display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', cursor: 'pointer' }}
                  onClick={() => onEditShift(shift)} title={`${doc.name} (${timeA}) - Mañana`}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{doc.name}</span>
                    <span style={{ fontSize: '0.58rem', opacity: 0.9, color: 'white' }}>{timeA}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_SHIFT', payload: shift.id }); }} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={10} />
                  </button>
                </div>
                {/* Afternoon half */}
                <div style={{ backgroundColor: partnerDoc.color, display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.3)' }}
                  onClick={() => onEditShift(partnerShift)} title={`${partnerDoc.name} (${timeB}) - Tarde`}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{partnerDoc.name}</span>
                    <span style={{ fontSize: '0.58rem', opacity: 0.9, color: 'white' }}>{timeB}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_SHIFT', payload: partnerShift.id }); }} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={10} />
                  </button>
                </div>
              </div>
            );
          }

          rendered.add(shift.id);
          const timeText = getShiftHoursText(shift, doc);
          return (
            <div 
              key={shift.id} 
              className="shift-badge" 
              style={{ backgroundColor: doc.color, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', maxWidth: '100%', boxSizing: 'border-box' }} 
              title={`${doc.name} (${timeText}) - Clic para ajustar horario`}
              onClick={() => onEditShift(shift)}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2, overflow: 'hidden', minWidth: 0, flex: 1 }}>
                <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{doc.name}</span>
                <span style={{ fontSize: '0.6rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{timeText}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_SHIFT', payload: shift.id }); }} style={{ flexShrink: 0 }}>
                <X size={12} />
              </button>
            </div>
          );
        });
      })()}
    </div>
  );
};

export const Calendar = () => {
  const { state } = useStore();
  const [editingShift, setEditingShift] = React.useState<any>(null);
  const monthStart = startOfMonth(state.currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday is 1
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="calendar-grid glass" style={{ padding: '20px' }}>
      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
        <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px 0', color: 'var(--text-muted)' }}>{day}</div>
      ))}
      {days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayShifts = state.shifts.filter(s => s.dateStr === dateStr);
        const dayShiftsList = dayShifts.filter(s => s.type === 'day');
        const nightShiftsList = dayShifts.filter(s => s.type === 'night');
        
        const isCurrentMonth = isSameMonth(day, monthStart);
        const wknd = isWeekend(day);

        return (
          <div 
            key={day.toString()} 
            className="calendar-day" 
            style={{ 
              opacity: isCurrentMonth ? 1 : 0.4, 
              border: '1px solid rgba(0,0,0,0.05)', 
              borderRadius: '8px',
              background: 'white'
            }}
          >
            <div className="day-header">
              <span>{format(day, dateFormat)}</span>
              {wknd && <span style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>Fin de semana</span>}
            </div>
            
            <DroppableZone 
              id={`drop-${dateStr}-day`} 
              title={`Día (${dayShiftsList.length}/${wknd ? 4 : 7})`} 
              type="day" 
              shifts={dayShiftsList} 
              doctors={state.doctors} 
              dateStr={dateStr}
              onEditShift={setEditingShift}
            />
            
            <DroppableZone 
              id={`drop-${dateStr}-night`} 
              title={`Noche (${nightShiftsList.length}/1)`} 
              type="night" 
              shifts={nightShiftsList} 
              doctors={state.doctors} 
              dateStr={dateStr}
              onEditShift={setEditingShift}
            />
          </div>
        );
      })}
      
      {editingShift && (
        <EditShiftModal shift={editingShift} onClose={() => setEditingShift(null)} />
      )}
    </div>
  );
};
