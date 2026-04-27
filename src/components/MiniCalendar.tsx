import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/StoreContext';
import type { VersionedDoctor } from '../store/types';

interface MiniCalendarProps {
  doctor: VersionedDoctor;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ doctor }) => {
  const { state, dispatch } = useStore();
  const monthStart = startOfMonth(state.ui.currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const blackoutDates = doctor.blackoutDates || [];

  const toggleDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    let newBlackoutDates: string[];

    if (blackoutDates.includes(dateStr)) {
      newBlackoutDates = blackoutDates.filter(d => d !== dateStr);
    } else {
      newBlackoutDates = [...blackoutDates, dateStr];
    }

    dispatch({
      type: 'UPDATE_DOCTOR',
      payload: { ...doctor, blackoutDates: newBlackoutDates }
    });
  };

  return (
    <div className="mini-calendar" style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '8px', fontSize: '0.7rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4px', fontWeight: 'bold', textTransform: 'capitalize' }}>
        {format(monthStart, 'MMMM yyyy', { locale: es })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', opacity: 0.5 }}>{d}</div>
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isBlackout = blackoutDates.includes(dateStr);
          const isCurrentMonth = isSameMonth(day, monthStart);

          return (
            <div
              key={dateStr}
              onClick={() => isCurrentMonth && toggleDate(day)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isCurrentMonth ? 'pointer' : 'default',
                borderRadius: '4px',
                background: isBlackout ? 'var(--danger)' : (isCurrentMonth ? 'rgba(255,255,255,0.5)' : 'transparent'),
                color: isBlackout ? 'white' : (isCurrentMonth ? 'inherit' : 'transparent'),
                opacity: isCurrentMonth ? 1 : 0,
                border: isCurrentMonth && isSameDay(day, new Date()) ? '1px solid var(--primary)' : 'none'
              }}
              title={isBlackout ? 'No disponible' : 'Disponible'}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '4px', fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Toca un día para marcarlo como no disponible.
      </div>
    </div>
  );
};
