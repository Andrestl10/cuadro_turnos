import { startOfMonth, endOfMonth, eachDayOfInterval, format, isWeekend } from 'date-fns';
import type { Doctor, Shift } from '../types';
import { validateShifts } from './validation';

export const generateSchedule = (
  currentMonth: Date,
  doctors: Doctor[],
  existingShifts: Shift[]
): Omit<Shift, 'id'>[] => {
  const newShifts: Omit<Shift, 'id'>[] = [];
  const allShifts = [...existingShifts];

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Helper to count shifts per doctor for balancing
  const getShiftCount = (docId: string) => {
    return allShifts.filter(s => s.doctorId === docId).length;
  };

  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isWknd = isWeekend(day);
    const requiredDay = isWknd ? 4 : 7;
    const requiredNight = 1;

    // Check currently assigned
    const dayShifts = allShifts.filter(s => s.dateStr === dateStr && s.type === 'day');
    const nightShifts = allShifts.filter(s => s.dateStr === dateStr && s.type === 'night');

    let missingDay = Math.max(0, requiredDay - dayShifts.length);
    let missingNight = Math.max(0, requiredNight - nightShifts.length);

    // Helper to try assigning a shift type
    const tryAssign = (type: 'day' | 'night') => {
      // Sort doctors by number of assigned shifts (ascending) to maintain equity
      const sortedDocs = [...doctors].sort((a, b) => getShiftCount(a.id) - getShiftCount(b.id));

      for (const doc of sortedDocs) {
        // If doc is already assigned on this day, skip
        if (allShifts.some(s => s.dateStr === dateStr && s.doctorId === doc.id)) {
          continue;
        }

        // If doc reached max monthly shifts, skip
        if (getShiftCount(doc.id) >= doc.maxMonthlyShifts) {
          continue;
        }

        // Test assigning this doctor
        const testShift: Omit<Shift, 'id'> = { dateStr, type, doctorId: doc.id };
        const testShifts = [...allShifts, { ...testShift, id: 'temp' }]; 
        
        const errors = validateShifts(testShifts, doctors).filter(r => r.type === 'error' && r.doctorId === doc.id);
        
        // If no errors for this doctor, assign!
        if (errors.length === 0) {
          allShifts.push({ ...testShift, id: `temp-${Math.random()}` });
          newShifts.push(testShift);
          return true;
        }
      }
      return false; // Could not find a valid doctor
    };

    // Always assign night first because it has stricter rest rules (48h)
    while (missingNight > 0) {
      if (!tryAssign('night')) break; // Prevent infinite loop if impossible
      missingNight--;
    }

    while (missingDay > 0) {
      if (!tryAssign('day')) break;
      missingDay--;
    }
  }

  return newShifts;
};
