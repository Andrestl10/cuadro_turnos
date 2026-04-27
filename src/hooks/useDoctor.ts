import { useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import { selectDoctorById, selectDoctorStats } from '../store/selectors';

/**
 * Hook to get a single doctor by ID
 * Memoized to prevent unnecessary re-renders
 */
export const useDoctor = (doctorId: string | null) => {
  const { state } = useStore();

  return useMemo(() => {
    if (!doctorId) return null;
    return selectDoctorById(state, doctorId);
  }, [state, doctorId]);
};

/**
 * Hook to get doctor statistics
 * Includes shift counts, hours, and limit status
 */
export const useDoctorStats = (doctorId: string | null, monthKey?: string) => {
  const { state } = useStore();

  return useMemo(() => {
    if (!doctorId) return null;
    return selectDoctorStats(state, doctorId, monthKey);
  }, [state, doctorId, monthKey]);
};
