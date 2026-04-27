import { useStore } from '../store/StoreContext';
import { ValidationService } from '../services/ValidationService';
import type { ValidationResult } from '../types';
import type { VersionedShift } from '../store/types';

/**
 * Hook to validate shifts (thin wrapper over ValidationService + current state).
 */
export const useValidation = () => {
  const { state } = useStore();

  return {
    validateShift: (shift: Omit<VersionedShift, 'version' | 'lastModifiedAt'>): ValidationResult[] =>
      ValidationService.getShiftErrors(shift, state),

    canAssignShift: (shift: Omit<VersionedShift, 'version' | 'lastModifiedAt'>): boolean =>
      ValidationService.canAssignShift(shift, state),

    validateAllShifts: (): ValidationResult[] => ValidationService.validateAllShifts(state),

    getValidationSummary: () => ValidationService.getValidationSummary(state)
  };
};
