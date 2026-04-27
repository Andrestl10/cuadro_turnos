import type { AppState, VersionedDoctor, VersionedShift } from '../store/types';
import type { ValidationResult } from '../types';
import { selectShiftsByDoctor, selectDoctorById, selectAllShifts } from '../store/selectors';
import { validateShifts } from '../utils/validation';

/**
 * Validation Service
 * Provides preventive validation for doctor and shift assignments
 * Uses the existing validation.ts but exposes it through a more structured API
 */

export class ValidationService {
  /**
   * Check if a shift can be assigned without breaking validation rules
   * Returns true if valid, false if invalid
   */
  static canAssignShift(
    shift: Omit<VersionedShift, 'version' | 'lastModifiedAt'>,
    state: AppState
  ): boolean {
    const errors = this.getShiftErrors(shift, state);
    return errors.filter(e => e.type === 'error').length === 0;
  }

  /**
   * Get all validation errors and warnings for a shift assignment
   */
  static getShiftErrors(
    shift: Omit<VersionedShift, 'version' | 'lastModifiedAt'>,
    state: AppState
  ): ValidationResult[] {
    const doctor = selectDoctorById(state, shift.doctorId);
    if (!doctor) {
      return [
        {
          isValid: false,
          message: 'Doctor not found',
          type: 'error',
          doctorId: shift.doctorId
        }
      ];
    }

    // Create a test state with the new shift added
    const testShift: VersionedShift = {
      ...shift,
      version: 1,
      lastModifiedAt: Date.now()
    };

    const allShifts = selectAllShifts(state);
    const testShifts = [...allShifts, testShift];
    const doctors = Object.values(state.entities.doctors);

    // Use existing validation logic
    return validateShifts(testShifts, doctors);
  }

  /**
   * Check if a doctor can be updated with new properties
   * Returns true if valid, false if invalid
   */
  static canUpdateDoctor(
    doctorId: string,
    changes: Partial<VersionedDoctor>,
    state: AppState
  ): boolean {
    const errors = this.getDoctorUpdateErrors(doctorId, changes, state);
    return errors.filter(e => e.type === 'error').length === 0;
  }

  /**
   * Get validation errors for updating a doctor
   * For example, reducing maxMonthlyShifts below current shift count
   */
  static getDoctorUpdateErrors(
    doctorId: string,
    changes: Partial<VersionedDoctor>,
    state: AppState
  ): ValidationResult[] {
    const doctor = selectDoctorById(state, doctorId);
    if (!doctor) {
      return [
        {
          isValid: false,
          message: 'Doctor not found',
          type: 'error',
          doctorId
        }
      ];
    }

    const errors: ValidationResult[] = [];

    // If reducing maxMonthlyShifts, check if doctor already has more shifts
    if (changes.maxMonthlyShifts !== undefined && changes.maxMonthlyShifts < doctor.maxMonthlyShifts) {
      const shifts = selectShiftsByDoctor(state, doctorId);
      if (shifts.length > changes.maxMonthlyShifts) {
        errors.push({
          isValid: false,
          message: `Doctor has ${shifts.length} shifts assigned, but new limit is ${changes.maxMonthlyShifts}. Cannot reduce maximum below current assignments.`,
          type: 'error',
          doctorId
        });
      }
    }

    // If setting fixedShiftType, validate existing shifts don't conflict
    if (changes.fixedShiftType) {
      const shifts = selectShiftsByDoctor(state, doctorId);
      const conflictingShifts = shifts.filter(s => s.type !== changes.fixedShiftType);
      if (conflictingShifts.length > 0) {
        errors.push({
          isValid: false,
          message: `Doctor has ${conflictingShifts.length} shifts of type "${conflictingShifts[0].type}" but fixed shift type is "${changes.fixedShiftType}". Reassign or remove conflicting shifts first.`,
          type: 'error',
          doctorId
        });
      }
    }

    // If setting noWeekends, check for existing weekend shifts
    if (changes.noWeekends === true && !doctor.noWeekends) {
      const shifts = selectShiftsByDoctor(state, doctorId);
      const weekendShifts = shifts.filter(s => {
        const date = new Date(s.dateStr);
        const day = date.getDay();
        return day === 0 || day === 6; // 0=Sunday, 6=Saturday
      });
      if (weekendShifts.length > 0) {
        errors.push({
          isValid: false,
          message: `Doctor has ${weekendShifts.length} weekend shifts assigned. Remove them before setting "no weekends" constraint.`,
          type: 'error',
          doctorId
        });
      }
    }

    return errors;
  }

  /**
   * Validate all shifts in the current state
   * Returns array of validation results
   */
  static validateAllShifts(state: AppState): ValidationResult[] {
    const allShifts = selectAllShifts(state);
    const doctors = Object.values(state.entities.doctors);
    return validateShifts(allShifts, doctors);
  }

  /**
   * Get summary of validation issues
   */
  static getValidationSummary(state: AppState) {
    const results = this.validateAllShifts(state);
    const errors = results.filter(r => r.type === 'error');
    const warnings = results.filter(r => r.type === 'warning');

    return {
      isValid: errors.length === 0,
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      errors,
      warnings
    };
  }
}
