import { startOfMonth, endOfMonth, eachDayOfInterval, format, isWeekend, subDays } from 'date-fns';
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
      const getScore = (doc: Doctor) => {
        let score = getShiftCount(doc.id) * 100;
        let consecutiveBefore = 0;
        let hadNightShiftTwoDaysAgo = false;
        
        for (let i = 1; i <= 3; i++) {
          const prevDate = format(subDays(day, i), 'yyyy-MM-dd');
          const shift = allShifts.find(s => s.dateStr === prevDate && s.doctorId === doc.id);
          if (shift) {
            if (shift.type === 'night') {
              if (i === 2) hadNightShiftTwoDaysAgo = true;
              consecutiveBefore++;
              break; 
            } else {
              consecutiveBefore++;
            }
          } else {
            break;
          }
        }

        if (type === 'night') {
          if (consecutiveBefore === 2) {
            score -= 80; // Prefer 2 consecutive days before a night shift
          } else if (consecutiveBefore === 0) {
            score += 150; // Penalize starting an isolated block with a night shift
          }
        } else {
          // type === 'day'
          if (consecutiveBefore > 0 && consecutiveBefore < 3) {
            score -= 60; // Prefer continuing a block to reach 2-3 consecutive days
          }
          if (hadNightShiftTwoDaysAgo) {
            score += 200; // Heavily penalize 24h rest to strongly prefer 48h rest
          }
        }
        return score;
      };

      // Sort doctors by score (lowest score = best candidate)
      const sortedDocs = [...doctors].sort((a, b) => getScore(a) - getScore(b));

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
