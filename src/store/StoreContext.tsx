import React, { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { Doctor, Shift } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { firebaseDb } from '../firebase';
import { loadSchedule, saveSchedule, toMonthKey } from '../utils/rtdb';

interface State {
  doctors: Doctor[];
  shifts: Shift[];
  past: Pick<State, 'doctors' | 'shifts'>[];
  future: Pick<State, 'doctors' | 'shifts'>[];
  currentMonth: Date;
}

type Action =
  | { type: 'ADD_DOCTOR'; payload: Omit<Doctor, 'id'> }
  | { type: 'REMOVE_DOCTOR'; payload: string }
  | { type: 'UPDATE_DOCTOR'; payload: Doctor }
  | { type: 'ADD_SHIFT'; payload: Omit<Shift, 'id'> }
  | { type: 'ADD_SHIFTS'; payload: Omit<Shift, 'id'>[] }
  | { type: 'UPDATE_SHIFT'; payload: Shift }
  | { type: 'REMOVE_SHIFT'; payload: string }
  | { type: 'SET_MONTH'; payload: Date }
  | { type: 'HYDRATE_MONTH'; payload: { doctors: Doctor[]; shifts: Shift[] } }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const initialState: State = {
  doctors: [
    {
      id: '1', name: 'Dr. García', color: '#EF4444', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
      noWeekends: false
    },
    {
      id: '2', name: 'Dra. Martínez', color: '#3B82F6', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
      noWeekends: false
    },
    {
      id: '3', name: 'Dr. López', color: '#10B981', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
      noWeekends: false
    },
    {
      id: '4', name: 'Dra. Rodríguez', color: '#F59E0B', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
      noWeekends: false
    },
    {
      id: '5', name: 'Dr. Hernández', color: '#8B5CF6', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
      noWeekends: false
    },
    {
      id: '6', name: 'Dra. Pérez', color: '#EC4899', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
      noWeekends: false
    },
    {
      id: '7', name: 'Dr. Sánchez', color: '#14B8A6', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
      noWeekends: false
    },
    {
      id: '8', name: 'Dra. Romero', color: '#F97316', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
      noWeekends: false
    },
  ],
  shifts: [],
  past: [],
  future: [],
  currentMonth: new Date()
};

const reducer = (state: State, action: Action): State => {
  const saveHistory = (newState: Partial<State>) => ({
    ...state,
    ...newState,
    past: [...state.past, { doctors: state.doctors, shifts: state.shifts }],
    future: []
  });

  switch (action.type) {
    case 'ADD_DOCTOR':
      return saveHistory({ doctors: [...state.doctors, { ...action.payload, id: uuidv4() }] });
    case 'REMOVE_DOCTOR':
      return saveHistory({
        doctors: state.doctors.filter(d => d.id !== action.payload),
        shifts: state.shifts.filter(s => s.doctorId !== action.payload)
      });
    case 'UPDATE_DOCTOR':
      return saveHistory({
        doctors: state.doctors.map(d => d.id === action.payload.id ? action.payload : d)
      });
    case 'ADD_SHIFT':
      return saveHistory({ shifts: [...state.shifts, { ...action.payload, id: uuidv4() }] });
    case 'ADD_SHIFTS':
      {
        const newShiftsWithIds = action.payload.map(s => ({ ...s, id: uuidv4() }));
        return saveHistory({ shifts: [...state.shifts, ...newShiftsWithIds] });
      }
    case 'UPDATE_SHIFT':
      return saveHistory({
        shifts: state.shifts.map(s => s.id === action.payload.id ? action.payload : s)
      });
    case 'REMOVE_SHIFT':
      return saveHistory({ shifts: state.shifts.filter(s => s.id !== action.payload) });
    case 'SET_MONTH':
      return { ...state, currentMonth: action.payload };
    case 'HYDRATE_MONTH': {
      const doctors = Array.isArray(action.payload.doctors) ? action.payload.doctors : [];
      const shifts = Array.isArray(action.payload.shifts) ? action.payload.shifts : [];
      return {
        ...state,
        doctors,
        shifts,
        past: [],
        future: []
      };
    }
    case 'UNDO':
      if (state.past.length === 0) return state;
      {
        const previous = state.past.at(-1);
        if (!previous) return state;
        const newPast = state.past.slice(0, -1);
      return {
        ...state,
        ...previous,
        past: newPast,
        future: [{ doctors: state.doctors, shifts: state.shifts }, ...state.future]
      };
      }
    case 'REDO':
      if (state.future.length === 0) return state;
      {
        const next = state.future[0];
        const newFuture = state.future.slice(1);
        return {
          ...state,
          ...next,
          past: [...state.past, { doctors: state.doctors, shifts: state.shifts }],
          future: newFuture
        };
      }
    default:
      return state;
  }
};

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode; syncEnabled?: boolean }> = ({
  children,
  syncEnabled = true
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const monthKey = useMemo(() => toMonthKey(state.currentMonth), [state.currentMonth]);
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  // Load schedule for current month (and when month changes).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await loadSchedule(firebaseDb, monthKey);
        if (cancelled) return;
        if (remote) {
          dispatch({ type: 'HYDRATE_MONTH', payload: { doctors: remote.doctors, shifts: remote.shifts } });
        }
      } catch (err) {
        console.warn('RTDB loadSchedule failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  // Save schedule (debounced) when doctors/shifts change.
  useEffect(() => {
    if (!syncEnabled) return;
    const handle = globalThis.setTimeout(() => {
      saveSchedule(firebaseDb, monthKey, { doctors: state.doctors, shifts: state.shifts }).catch((err) => {
        console.warn('RTDB saveSchedule failed', err);
      });
    }, 600);

    return () => {
      globalThis.clearTimeout(handle);
    };
  }, [monthKey, state.doctors, state.shifts, syncEnabled]);

  return <StoreContext.Provider value={contextValue}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
