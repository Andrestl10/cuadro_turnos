import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Doctor, Shift } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
      const newShiftsWithIds = action.payload.map(s => ({ ...s, id: uuidv4() }));
      return saveHistory({ shifts: [...state.shifts, ...newShiftsWithIds] });
    case 'UPDATE_SHIFT':
      return saveHistory({
        shifts: state.shifts.map(s => s.id === action.payload.id ? action.payload : s)
      });
    case 'REMOVE_SHIFT':
      return saveHistory({ shifts: state.shifts.filter(s => s.id !== action.payload) });
    case 'SET_MONTH':
      return { ...state, currentMonth: action.payload };
    case 'UNDO':
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      return {
        ...state,
        ...previous,
        past: newPast,
        future: [{ doctors: state.doctors, shifts: state.shifts }, ...state.future]
      };
    case 'REDO':
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        ...state,
        ...next,
        past: [...state.past, { doctors: state.doctors, shifts: state.shifts }],
        future: newFuture
      };
    default:
      return state;
  }
};

const StoreContext = createContext<{ state: State; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
