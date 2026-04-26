export type ShiftType = 'day' | 'night';

export interface Doctor {
  id: string;
  name: string;
  color: string;
  isFixed: boolean;
  fixedDays: number[]; // 0 for Sunday, 1 for Monday, etc.
  fixedShiftType?: ShiftType;
  maxMonthlyShifts: number;
  shiftHours: number;
  noWeekends: boolean;
}

export interface Shift {
  id: string;
  dateStr: string; // YYYY-MM-DD
  type: ShiftType;
  doctorId: string;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  type: 'error' | 'warning';
  doctorId?: string;
  dateStr?: string;
}

export interface State {
  doctors: Doctor[];
  shifts: Shift[];
  currentMonth: Date;
}
