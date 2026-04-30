import React from 'react';
import { useStore } from '../store/StoreContext';
import { selectShiftsByDate, selectDoctorById, selectPartnerShift } from '../store/selectors';
import type { VersionedDoctor, VersionedShift } from '../store/types';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, startOfWeek, endOfWeek, isWeekend } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { X } from 'lucide-react';

const EditShiftModal = ({ shift, onClose }: { shift: VersionedShift; onClose: () => void }) => {
  const { state, dispatch } = useStore();
  const doc = selectDoctorById(state, shift.doctorId);

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
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
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

const getShiftHoursText = (shift: VersionedShift, doc: VersionedDoctor) => {
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

type DroppableZoneProps = {
  id: string;
  title: string;
  type: 'day' | 'night';
  customStartTime?: string;
  customEndTime?: string;
  shifts: VersionedShift[];
  dateStr: string;
  onEditShift: (shift: VersionedShift) => void;
  readOnly?: boolean;
};

const DroppableZone = ({
  id,
  title,
  type,
  customStartTime,
  customEndTime,
  shifts,
  dateStr,
  onEditShift,
  readOnly
}: DroppableZoneProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { dateStr, type, customStartTime, customEndTime }
  });
  const { dispatch, state } = useStore();

  return (
    <div
      ref={setNodeRef}
      className={`drop-zone ${type}-zone ${isOver ? 'active' : ''}`}
    >
      <div className="drop-zone-title">{title}</div>
      {(() => {
        const rendered = new Set<string>();
        return shifts.map((shift: VersionedShift) => {
          if (rendered.has(shift.id)) return null;
          const doc = selectDoctorById(state, shift.doctorId);
          if (!doc) return null;

          const partnerShift = doc.partnerId
            ? selectPartnerShift(state, shift.doctorId, shift.dateStr, shift.type)
            : null;
          const partnerDoc = partnerShift
            ? selectDoctorById(state, partnerShift.doctorId)
            : null;

          if (partnerShift && partnerDoc) {
            rendered.add(shift.id);
            rendered.add(partnerShift.id);
            const timeA = getShiftHoursText(shift, doc);
            const timeB = getShiftHoursText(partnerShift, partnerDoc);
            return (
              <div key={shift.id} style={{ display: 'flex', flexDirection: 'column', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', width: '100%', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                {/* Morning half */}
                <div style={{ backgroundColor: doc.color, display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', cursor: readOnly ? 'default' : 'pointer' }}
                  onClick={() => !readOnly && onEditShift(shift)} title={`${doc.name} (${timeA}) - Mañana`}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{doc.name}</span>
                  </div>
                  {!readOnly && (
                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_SHIFT', payload: shift.id }); }} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={10} />
                    </button>
                  )}
                </div>
                {/* Afternoon half */}
                <div style={{ backgroundColor: partnerDoc.color, display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px', cursor: readOnly ? 'default' : 'pointer', borderTop: '1px solid rgba(255,255,255,0.3)' }}
                  onClick={() => !readOnly && onEditShift(partnerShift)} title={`${partnerDoc.name} (${timeB}) - Tarde`}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'white' }}>{partnerDoc.name}</span>
                  </div>
                  {!readOnly && (
                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_SHIFT', payload: partnerShift.id }); }} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={10} />
                    </button>
                  )}
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
              style={{ backgroundColor: doc.color, display: 'flex', alignItems: 'center', gap: '6px', cursor: readOnly ? 'default' : 'pointer', maxWidth: '100%', boxSizing: 'border-box' }}
              title={`${doc.name} (${timeText})${!readOnly ? ' - Clic para ajustar horario' : ''}`}
              onClick={() => !readOnly && onEditShift(shift)}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  minWidth: 0,
                  flex: 1
                }}
              >
                <span
                  style={{
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%'
                  }}
                >
                  {doc.name}
                </span>
              </div>
              {!readOnly && (
                <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_SHIFT', payload: shift.id }); }} style={{ flexShrink: 0 }}>
                  <X size={12} />
                </button>
              )}
            </div>
          );
        });
      })()}
    </div>
  );
};

export const Calendar = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { state } = useStore();
  const [editingShift, setEditingShift] = React.useState<VersionedShift | null>(null);
  const monthStart = startOfMonth(state.ui.currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday is 1
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <>
      <div className="calendar-scroll">
        <div className="calendar-grid glass" style={{ padding: '20px' }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                padding: '10px 0',
                color: 'var(--text-muted)'
              }}
            >
              {day}
            </div>
          ))}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayShifts = selectShiftsByDate(state, dateStr);
            const dayShiftsList = dayShifts.filter(s => s.type === 'day');
            const nightShiftsList = dayShifts.filter(s => s.type === 'night');

            const isCurrentMonth = isSameMonth(day, monthStart);
            const wknd = isWeekend(day);

            const shifts6to13 = dayShiftsList.filter(s => s.customStartTime === '06:00' && s.customEndTime === '13:00');
            const shifts6to18 = dayShiftsList.filter(s => (s.customStartTime === '06:00' && s.customEndTime === '18:00') || (!s.customStartTime && !s.customEndTime));
            const shifts8to20 = dayShiftsList.filter(s => s.customStartTime === '08:00' && s.customEndTime === '20:00');
            const shifts14to20 = dayShiftsList.filter(s => s.customStartTime === '14:00' && s.customEndTime === '20:00');
            
            const allMatchedIds = new Set([...shifts6to13, ...shifts6to18, ...shifts8to20, ...shifts14to20].map(s => s.id));
            const otherDayShifts = dayShiftsList.filter(s => !allMatchedIds.has(s.id));
            shifts6to18.push(...otherDayShifts);

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
                  {wknd && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>
                      Fin de semana
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <DroppableZone
                    id={`drop-${dateStr}-day-6-13`}
                    title={`6:00 - 13:00 (${shifts6to13.length})`}
                    type="day"
                    customStartTime="06:00"
                    customEndTime="13:00"
                    shifts={shifts6to13}
                    dateStr={dateStr}
                    onEditShift={setEditingShift}
                    readOnly={readOnly}
                  />
                  <DroppableZone
                    id={`drop-${dateStr}-day-6-18`}
                    title={`6:00 - 18:00 (${shifts6to18.length})`}
                    type="day"
                    customStartTime="06:00"
                    customEndTime="18:00"
                    shifts={shifts6to18}
                    dateStr={dateStr}
                    onEditShift={setEditingShift}
                    readOnly={readOnly}
                  />
                  <DroppableZone
                    id={`drop-${dateStr}-day-8-20`}
                    title={`8:00 - 20:00 (${shifts8to20.length})`}
                    type="day"
                    customStartTime="08:00"
                    customEndTime="20:00"
                    shifts={shifts8to20}
                    dateStr={dateStr}
                    onEditShift={setEditingShift}
                    readOnly={readOnly}
                  />
                  <DroppableZone
                    id={`drop-${dateStr}-day-14-20`}
                    title={`14:00 - 20:00 (${shifts14to20.length})`}
                    type="day"
                    customStartTime="14:00"
                    customEndTime="20:00"
                    shifts={shifts14to20}
                    dateStr={dateStr}
                    onEditShift={setEditingShift}
                    readOnly={readOnly}
                  />
                </div>

                <DroppableZone
                  id={`drop-${dateStr}-night`}
                  title={`Noche (${nightShiftsList.length}/1)`}
                  type="night"
                  shifts={nightShiftsList}
                  dateStr={dateStr}
                  onEditShift={setEditingShift}
                  readOnly={readOnly}
                />
              </div>
            );
          })}
        </div>
      </div>

      {!readOnly && editingShift && (
        <EditShiftModal shift={editingShift} onClose={() => setEditingShift(null)} />
      )}
    </>
  );
};
