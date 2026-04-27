import { useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import { selectShiftsByDate, selectShiftsByDateAndType } from '../store/selectors';

/**
 * Hook to get all shifts for a specific date
 * Memoized for efficient querying
 */
export const useShiftsForDay = (dateStr: string) => {
  const { state } = useStore();

  return useMemo(() => {
    return selectShiftsByDate(state, dateStr);
  }, [state, dateStr]);
};

/**
 * Hook to get shifts for a specific date and type
 */
export const useShiftsForDayAndType = (dateStr: string, type: 'day' | 'night') => {
  const { state } = useStore();

  return useMemo(() => {
    return selectShiftsByDateAndType(state, dateStr, type);
  }, [state, dateStr, type]);
};
