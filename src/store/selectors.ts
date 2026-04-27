import type { AppState, VersionedDoctor, VersionedShift } from './types';

/**
 * Selector functions for efficient querying of normalized state
 * All selectors are pure functions that return data by value
 */

/** Get doctor by ID - O(1) lookup */
export const selectDoctorById = (state: AppState, doctorId: string): VersionedDoctor | undefined => {
  return state.entities.doctors[doctorId];
};

/** Get all doctors as array */
export const selectAllDoctors = (state: AppState): VersionedDoctor[] => {
  return Object.values(state.entities.doctors);
};

/** Get shift by ID - O(1) lookup */
export const selectShiftById = (state: AppState, shiftId: string): VersionedShift | undefined => {
  return state.entities.shifts[shiftId];
};

/** Get all shifts as array */
export const selectAllShifts = (state: AppState): VersionedShift[] => {
  return Object.values(state.entities.shifts);
};

/** Get shifts for a specific date */
export const selectShiftsByDate = (state: AppState, dateStr: string): VersionedShift[] => {
  return Object.values(state.entities.shifts).filter(shift => shift.dateStr === dateStr);
};

/** Get shifts for a specific doctor */
export const selectShiftsByDoctor = (state: AppState, doctorId: string): VersionedShift[] => {
  return Object.values(state.entities.shifts).filter(shift => shift.doctorId === doctorId);
};

/** Get shifts for a specific doctor in a month (date range) */
export const selectShiftsByDoctorInMonth = (
  state: AppState,
  doctorId: string,
  monthKey: string // format: 'YYYY-MM'
): VersionedShift[] => {
  const prefix = monthKey + '-';
  return Object.values(state.entities.shifts).filter(
    shift => shift.doctorId === doctorId && shift.dateStr.startsWith(prefix)
  );
};

/** Get shifts for a specific date and type (day/night) */
export const selectShiftsByDateAndType = (
  state: AppState,
  dateStr: string,
  type: 'day' | 'night'
): VersionedShift[] => {
  return Object.values(state.entities.shifts).filter(
    shift => shift.dateStr === dateStr && shift.type === type
  );
};

/** Get doctor statistics: shift counts and hours */
export const selectDoctorStats = (
  state: AppState,
  doctorId: string,
  monthKey?: string // if provided, filter by month
) => {
  const doctor = selectDoctorById(state, doctorId);
  if (!doctor) return null;

  let shifts = selectShiftsByDoctor(state, doctorId);
  if (monthKey) {
    shifts = shifts.filter(s => s.dateStr.startsWith(monthKey));
  }

  const dayShifts = shifts.filter(s => s.type === 'day').length;
  const nightShifts = shifts.filter(s => s.type === 'night').length;
  const totalShifts = shifts.length;
  const totalHours = totalShifts * doctor.shiftHours;

  return {
    doctorId,
    doctorName: doctor.name,
    dayShifts,
    nightShifts,
    totalShifts,
    totalHours,
    maxMonthlyShifts: doctor.maxMonthlyShifts,
    isOverLimit: totalShifts > doctor.maxMonthlyShifts,
    spotsRemaining: Math.max(0, doctor.maxMonthlyShifts - totalShifts)
  };
};

/** Get all doctor statistics for a month */
export const selectAllDoctorStats = (state: AppState, monthKey: string) => {
  return selectAllDoctors(state).map(doctor =>
    selectDoctorStats(state, doctor.id, monthKey)
  ).filter(Boolean);
};

/** Get schedule statistics: shifts by date and type */
export const selectScheduleStats = (state: AppState, monthKey: string) => {
  const allShifts = Object.values(state.entities.shifts).filter(s =>
    s.dateStr.startsWith(monthKey)
  );

  const statsByDate: Record<string, { day: number; night: number }> = {};

  allShifts.forEach(shift => {
    if (!statsByDate[shift.dateStr]) {
      statsByDate[shift.dateStr] = { day: 0, night: 0 };
    }
    statsByDate[shift.dateStr][shift.type]++;
  });

  return statsByDate;
};

/** Check if doctor has a shift on a specific date and type */
export const selectDoctorHasShift = (
  state: AppState,
  doctorId: string,
  dateStr: string,
  type: 'day' | 'night'
): boolean => {
  return Object.values(state.entities.shifts).some(
    shift => shift.doctorId === doctorId && shift.dateStr === dateStr && shift.type === type
  );
};

/** Get partner's shift info if doctor is part of a pair */
export const selectPartnerShift = (
  state: AppState,
  doctorId: string,
  dateStr: string,
  type: 'day' | 'night'
): VersionedShift | undefined => {
  const doctor = selectDoctorById(state, doctorId);
  if (!doctor?.partnerId) return undefined;

  return Object.values(state.entities.shifts).find(
    shift => shift.doctorId === doctor.partnerId && shift.dateStr === dateStr && shift.type === type
  );
};

/** Get all doctors who are partners */
export const selectPartnerPairs = (state: AppState): Array<[VersionedDoctor, VersionedDoctor]> => {
  const doctors = selectAllDoctors(state);
  const pairs: Array<[VersionedDoctor, VersionedDoctor]> = [];
  const seen = new Set<string>();

  for (const doctor of doctors) {
    if (doctor.partnerId && !seen.has(doctor.id)) {
      const partner = selectDoctorById(state, doctor.partnerId);
      if (partner) {
        pairs.push([doctor, partner]);
        seen.add(doctor.id);
        seen.add(partner.id);
      }
    }
  }

  return pairs;
};

/** Select last N shifts for doctor (for validation of rest periods) */
export const selectLastShiftsForDoctor = (
  state: AppState,
  doctorId: string,
  limit: number = 5
): VersionedShift[] => {
  const shifts = selectShiftsByDoctor(state, doctorId);
  // Sort by date descending (most recent first)
  return shifts
    .sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime())
    .slice(0, limit);
};

/** Get current sync state */
export const selectSyncState = (state: AppState) => state.sync;

/** Get UI state */
export const selectUIState = (state: AppState) => state.ui;

/** Get pending changes count */
export const selectPendingChangesCount = (state: AppState) => state.sync.pendingChanges.length;

/** Get conflicted items count */
export const selectConflictedItemsCount = (state: AppState) => state.sync.conflictedItems.length;

/** Check if any conflicts exist */
export const selectHasConflicts = (state: AppState) => state.sync.conflictedItems.length > 0;
