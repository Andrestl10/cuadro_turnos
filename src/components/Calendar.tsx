import React from 'react';
import { useStore } from '../store/StoreContext';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, startOfWeek, endOfWeek, isWeekend } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { X } from 'lucide-react';

const DroppableZone = ({ id, title, type, shifts, doctors, dateStr }: any) => {
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
      {shifts.map((shift: any) => {
        const doc = doctors.find((d: any) => d.id === shift.doctorId);
        if (!doc) return null;
        return (
          <div key={shift.id} className="shift-badge" style={{ backgroundColor: doc.color }} title={doc.name}>
            <span>{doc.name}</span>
            <button onClick={() => dispatch({ type: 'REMOVE_SHIFT', payload: shift.id })}>
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const Calendar = () => {
  const { state } = useStore();
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
            />
            
            <DroppableZone 
              id={`drop-${dateStr}-night`} 
              title={`Noche (${nightShiftsList.length}/1)`} 
              type="night" 
              shifts={nightShiftsList} 
              doctors={state.doctors} 
              dateStr={dateStr} 
            />
          </div>
        );
      })}
    </div>
  );
};
