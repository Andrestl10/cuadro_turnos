import { differenceInDays, parseISO, isWeekend } from 'date-fns';
import type { Doctor, Shift, ValidationResult } from '../types';

export const validateShifts = (shifts: Shift[], doctors: Doctor[]): ValidationResult[] => {
  const results: ValidationResult[] = [];

  // Group shifts by doctor
  const shiftsByDoctor: Record<string, Shift[]> = {};
  doctors.forEach(d => shiftsByDoctor[d.id] = []);
  shifts.forEach(s => {
    if (shiftsByDoctor[s.doctorId]) {
      shiftsByDoctor[s.doctorId].push(s);
    }
  });

  // Sort shifts by date for each doctor
  Object.keys(shiftsByDoctor).forEach(docId => {
    shiftsByDoctor[docId].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  });

  // Check rules per doctor
  doctors.forEach(doc => {
    const docShifts = shiftsByDoctor[doc.id];
    let consecutiveDays = 0;

    // Check Max Monthly Shifts
    if (docShifts.length > doc.maxMonthlyShifts) {
      results.push({
        isValid: false,
        message: `Dr. ${doc.name} excede su límite mensual de turnos (${docShifts.length} / ${doc.maxMonthlyShifts}).`,
        type: 'error',
        doctorId: doc.id
      });
    }

    // Check Max Monthly Nights
    if (doc.maxMonthlyNights !== undefined) {
      const nightShifts = docShifts.filter(s => s.type === 'night');
      if (nightShifts.length > doc.maxMonthlyNights) {
        results.push({
          isValid: false,
          message: `Dr. ${doc.name} excede su límite mensual de noches (${nightShifts.length} / ${doc.maxMonthlyNights}).`,
          type: 'error',
          doctorId: doc.id
        });
      }
    }

    for (let i = 0; i < docShifts.length; i++) {
      const current = docShifts[i];
      const next = docShifts[i + 1];

      // Check fixedShiftType
      if (doc.fixedShiftType && current.type !== doc.fixedShiftType) {
        results.push({
          isValid: false,
          message: `Dr. ${doc.name} está asignado a un turno de ${current.type === 'day' ? 'Día' : 'Noche'} pero tiene turno fijo de ${doc.fixedShiftType === 'day' ? 'Día' : 'Noche'}.`,
          type: 'error',
          doctorId: doc.id,
          dateStr: current.dateStr
        });
      }

      // Check noWeekends
      if (doc.noWeekends && isWeekend(parseISO(current.dateStr))) {
        results.push({
          isValid: false,
          message: `Dr. ${doc.name} está asignado el fin de semana (${current.dateStr}) pero su contrato es L-V.`,
          type: 'error',
          doctorId: doc.id,
          dateStr: current.dateStr
        });
      }

      // Check blackout dates
      if (doc.blackoutDates?.includes(current.dateStr)) {
        results.push({
          isValid: false,
          message: `Dr. ${doc.name} no está disponible el ${current.dateStr}.`,
          type: 'error',
          doctorId: doc.id,
          dateStr: current.dateStr
        });
      }

      // Rule: 48h rest after night shift
      if (current.type === 'night') {
        if (next) {
          const daysDiff = differenceInDays(parseISO(next.dateStr), parseISO(current.dateStr));
          // A night shift goes into the next day. 48h rest means daysDiff >= 3. 24h rest means daysDiff === 2.
          if (daysDiff < 2) {
            results.push({
              isValid: false,
              message: `Dr. ${doc.name} no tiene descanso después del turno nocturno del ${current.dateStr}.`,
              type: 'error',
              doctorId: doc.id,
              dateStr: current.dateStr
            });
          } else if (daysDiff === 2) {
            results.push({
              isValid: true,
              message: `Dr. ${doc.name} tiene solo 24h de descanso tras el turno de noche del ${current.dateStr} (Preferible 48h).`,
              type: 'warning',
              doctorId: doc.id,
              dateStr: next.dateStr
            });
          }

          // Rule: Cannot do Night -> Night without a Day shift in between (unless fixed night)
          if (next.type === 'night' && doc.fixedShiftType !== 'night') {
            results.push({
              isValid: false,
              message: `Dr. ${doc.name} no puede hacer otro turno de Noche el ${next.dateStr} sin turnos de Día intermedios.`,
              type: 'error',
              doctorId: doc.id,
              dateStr: next.dateStr
            });
          }
        }
      }

      // Check consecutive days
      if (next) {
        const daysDiff = differenceInDays(parseISO(next.dateStr), parseISO(current.dateStr));
        if (daysDiff === 1) {
          consecutiveDays++;
          // Rule: max 3 consecutive days + 1 night (total 4) or 3 consecutive days
          if (consecutiveDays >= 4 || (consecutiveDays === 3 && next.type === 'day')) {
            results.push({
              isValid: false,
              message: `Dr. ${doc.name} excede el límite de turnos consecutivos el ${next.dateStr}.`,
              type: 'error',
              doctorId: doc.id,
              dateStr: next.dateStr
            });
          }
        } else {
          consecutiveDays = 0;
        }
      }
    }
  });

  // Check Daily Quotas
  const shiftsByDate: Record<string, { day: number, night: number }> = {};
  shifts.forEach(s => {
    if (!shiftsByDate[s.dateStr]) {
      shiftsByDate[s.dateStr] = { day: 0, night: 0 };
    }
    shiftsByDate[s.dateStr][s.type]++;
  });

  Object.entries(shiftsByDate).forEach(([dateStr, counts]) => {
    const isWknd = isWeekend(parseISO(dateStr));
    const expectedDay = isWknd ? 4 : 7;
    const expectedNight = 1;

    if (counts.day > expectedDay) {
      results.push({
        isValid: false,
        message: `Sobrecupo en turno de día el ${dateStr}. Asignados: ${counts.day}, Permitidos: ${expectedDay}.`,
        type: 'error',
        dateStr
      });
    } else if (counts.day < expectedDay) {
      results.push({
        isValid: true, // warning is conceptually not invalidating the whole set, but flags an issue
        message: `Faltan médicos en turno de día el ${dateStr}. Asignados: ${counts.day}, Requeridos: ${expectedDay}.`,
        type: 'warning',
        dateStr
      });
    }

    if (counts.night > expectedNight) {
      results.push({
        isValid: false,
        message: `Sobrecupo en turno de noche el ${dateStr}. Asignados: ${counts.night}, Permitidos: ${expectedNight}.`,
        type: 'error',
        dateStr
      });
    } else if (counts.night < expectedNight) {
      results.push({
        isValid: true,
        message: `Falta médico en turno de noche el ${dateStr}. Asignados: ${counts.night}, Requeridos: ${expectedNight}.`,
        type: 'warning',
        dateStr
      });
    }
  });

  return results;
};
