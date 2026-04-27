import React, { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { AppState, StoreAction, VersionedDoctor, VersionedShift } from './types';
import { v4 as uuidv4 } from 'uuid';
import { ScheduleService, toMonthKey } from '../services/ScheduleService';

const initialUIState = {
  currentMonth: new Date(),
  selectedDoctorId: null,
  isValidating: false,
  showConflictModal: false,
  offlineMode: false
};

const initialSyncState = {
  status: 'idle' as const,
  lastSyncAt: 0,
  pendingChanges: [],
  conflictedItems: [],
  lastError: null
};


const initialDoctors: Record<string, VersionedDoctor> = {
  '1': {
    id: '1', name: 'Dr. García', color: '#EF4444', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
    noWeekends: false, version: 1, lastModifiedAt: Date.now()
  },
  '2': {
    id: '2', name: 'Dra. Martínez', color: '#3B82F6', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
    noWeekends: false, version: 1, lastModifiedAt: Date.now()
  },
  '3': {
    id: '3', name: 'Dr. López', color: '#10B981', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
    noWeekends: false, version: 1, lastModifiedAt: Date.now()
  },
  '4': {
    id: '4', name: 'Dra. Rodríguez', color: '#F59E0B', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
    noWeekends: false, version: 1, lastModifiedAt: Date.now()
  },
  '5': {
    id: '5', name: 'Dr. Hernández', color: '#8B5CF6', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
    noWeekends: false, version: 1, lastModifiedAt: Date.now()
  },
  '6': {
    id: '6', name: 'Dra. Pérez', color: '#EC4899', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
    noWeekends: false, version: 1, lastModifiedAt: Date.now()
  },
  '7': {
    id: '7', name: 'Dr. Sánchez', color: '#14B8A6', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
    noWeekends: false, version: 1, lastModifiedAt: Date.now()
  },
  '8': {
    id: '8', name: 'Dra. Romero', color: '#F97316', isFixed: false, fixedDays: [], maxMonthlyShifts: 15, shiftHours: 12,
    noWeekends: false, version: 1, lastModifiedAt: Date.now()
  },
};

const initialState: AppState = {
  entities: {
    doctors: initialDoctors,
    shifts: {}
  },
  ui: initialUIState,
  sync: initialSyncState,
  past: [],
  future: []
};

const reducer = (state: AppState, action: StoreAction): AppState => {
  const saveHistory = (changes: Partial<AppState>) => ({
    ...state,
    ...changes,
    past: [...state.past, { doctors: state.entities.doctors, shifts: state.entities.shifts }],
    future: []
  });

  switch (action.type) {
    case 'ADD_DOCTOR': {
      const id = uuidv4();
      return saveHistory({
        entities: {
          ...state.entities,
          doctors: {
            ...state.entities.doctors,
            [id]: { ...action.payload, id, version: 1, lastModifiedAt: Date.now() } as VersionedDoctor
          }
        }
      });
    }

    case 'UPDATE_DOCTOR': {
      const doctorId = action.payload.id;
      return saveHistory({
        entities: {
          ...state.entities,
          doctors: {
            ...state.entities.doctors,
            [doctorId]: {
              ...action.payload,
              version: (state.entities.doctors[doctorId]?.version ?? 0) + 1,
              lastModifiedAt: Date.now()
            }
          }
        }
      });
    }

    case 'REMOVE_DOCTOR': {
      const doctorId = action.payload;
      const remainingDoctors = { ...state.entities.doctors };
      delete remainingDoctors[doctorId];
      const filteredShifts = Object.fromEntries(
        Object.entries(state.entities.shifts).filter(([, shift]) => shift.doctorId !== doctorId)
      );
      return saveHistory({
        entities: {
          doctors: remainingDoctors,
          shifts: filteredShifts
        }
      });
    }

    case 'ADD_SHIFT': {
      const id = uuidv4();
      return saveHistory({
        entities: {
          ...state.entities,
          shifts: {
            ...state.entities.shifts,
            [id]: { ...action.payload, id, version: 1, lastModifiedAt: Date.now() } as VersionedShift
          }
        }
      });
    }

    case 'ADD_SHIFTS': {
      const newShifts: Record<string, VersionedShift> = {};
      action.payload.forEach(shift => {
        const id = uuidv4();
        newShifts[id] = { ...shift, id, version: 1, lastModifiedAt: Date.now() } as VersionedShift;
      });
      return saveHistory({
        entities: {
          ...state.entities,
          shifts: {
            ...state.entities.shifts,
            ...newShifts
          }
        }
      });
    }

    case 'UPDATE_SHIFT': {
      const shiftId = action.payload.id;
      return saveHistory({
        entities: {
          ...state.entities,
          shifts: {
            ...state.entities.shifts,
            [shiftId]: {
              ...action.payload,
              version: (state.entities.shifts[shiftId]?.version ?? 0) + 1,
              lastModifiedAt: Date.now()
            }
          }
        }
      });
    }

    case 'REMOVE_SHIFT': {
      const shiftId = action.payload;
      const remainingShifts = { ...state.entities.shifts };
      delete remainingShifts[shiftId];
      return saveHistory({
        entities: {
          ...state.entities,
          shifts: remainingShifts
        }
      });
    }

    case 'SET_MONTH': {
      return { ...state, ui: { ...state.ui, currentMonth: action.payload } };
    }

    case 'SET_SELECTED_DOCTOR': {
      return { ...state, ui: { ...state.ui, selectedDoctorId: action.payload } };
    }

    case 'SET_VALIDATING': {
      return { ...state, ui: { ...state.ui, isValidating: action.payload } };
    }

    case 'SET_OFFLINE_MODE': {
      return { ...state, ui: { ...state.ui, offlineMode: action.payload } };
    }

    case 'HYDRATE_MONTH': {
      const docList = Array.isArray(action.payload.doctors) ? action.payload.doctors : [];
      const shiftList = Array.isArray(action.payload.shifts) ? action.payload.shifts : [];
      const doctors: Record<string, VersionedDoctor> = {};
      docList.forEach(doc => {
        doctors[doc.id] = {
          ...doc,
          version: typeof doc.version === 'number' ? doc.version : 1,
          lastModifiedAt: typeof doc.lastModifiedAt === 'number' ? doc.lastModifiedAt : Date.now()
        };
      });
      const shifts: Record<string, VersionedShift> = {};
      shiftList.forEach(shift => {
        shifts[shift.id] = {
          ...shift,
          version: typeof shift.version === 'number' ? shift.version : 1,
          lastModifiedAt: typeof shift.lastModifiedAt === 'number' ? shift.lastModifiedAt : Date.now()
        };
      });
      return {
        ...state,
        entities: { doctors, shifts },
        past: [],
        future: [],
        sync: { ...state.sync, status: 'idle' }
      };
    }

    case 'SET_SYNC_STATUS': {
      return { ...state, sync: { ...state.sync, status: action.payload } };
    }

    case 'SET_LAST_SYNC_AT': {
      return { ...state, sync: { ...state.sync, lastSyncAt: action.payload } };
    }

    case 'ADD_PENDING_CHANGE': {
      return {
        ...state,
        sync: {
          ...state.sync,
          pendingChanges: [...state.sync.pendingChanges, action.payload]
        }
      };
    }

    case 'CLEAR_PENDING_CHANGES': {
      return { ...state, sync: { ...state.sync, pendingChanges: [] } };
    }

    case 'SET_CONFLICTS': {
      return {
        ...state,
        sync: { ...state.sync, conflictedItems: action.payload },
        ui: { ...state.ui, showConflictModal: action.payload.length > 0 }
      };
    }

    case 'SHOW_CONFLICT_MODAL': {
      return { ...state, ui: { ...state.ui, showConflictModal: action.payload } };
    }

    case 'SET_SYNC_ERROR': {
      return { ...state, sync: { ...state.sync, lastError: action.payload } };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past.at(-1);
      if (!previous) return state;
      const newPast = state.past.slice(0, -1);
      return {
        ...state,
        entities: previous,
        past: newPast,
        future: [{ doctors: state.entities.doctors, shifts: state.entities.shifts }, ...state.future]
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        ...state,
        entities: next,
        past: [...state.past, { doctors: state.entities.doctors, shifts: state.entities.shifts }],
        future: newFuture
      };
    }

    default:
      return state;
  }
};

const StoreContext = createContext<{ state: AppState; dispatch: React.Dispatch<StoreAction> } | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode; syncEnabled?: boolean }> = ({
  children,
  syncEnabled = true
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const monthKey = useMemo(() => toMonthKey(state.ui.currentMonth), [state.ui.currentMonth]);
  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  // Load schedule for current month
  useEffect(() => {
    if (!syncEnabled) return;
    
    let cancelled = false;
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'loading' });

    (async () => {
      try {
        const remote = await ScheduleService.loadSchedule(monthKey);
        if (cancelled) return;
        if (remote) {
          dispatch({
            type: 'HYDRATE_MONTH',
            payload: { doctors: remote.doctors, shifts: remote.shifts }
          });
          dispatch({ type: 'SET_LAST_SYNC_AT', payload: remote.updatedAt });
        }
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
      } catch (err) {
        if (cancelled) return;
        console.warn('[StoreContext] loadSchedule failed', err);
        dispatch({ type: 'SET_SYNC_ERROR', payload: (err as Error).message });
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [monthKey, syncEnabled]);

  // Save schedule when doctors/shifts change (with debounce)
  useEffect(() => {
    if (!syncEnabled) return;

    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });

    const handle = globalThis.setTimeout(() => {
      const scheduleData = {
        doctors: Object.values(state.entities.doctors),
        shifts: Object.values(state.entities.shifts),
        updatedAt: Date.now(),
        version: 1
      };

      ScheduleService.saveSchedule(monthKey, scheduleData)
        .then(() => {
          dispatch({ type: 'SET_LAST_SYNC_AT', payload: Date.now() });
          dispatch({ type: 'CLEAR_PENDING_CHANGES' });
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
          dispatch({ type: 'SET_SYNC_ERROR', payload: null });
        })
        .catch((err) => {
          console.warn('[StoreContext] saveSchedule failed', err);
          dispatch({ type: 'SET_SYNC_ERROR', payload: (err as Error).message });
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
        });
    }, 600);

    return () => {
      globalThis.clearTimeout(handle);
    };
  }, [monthKey, state.entities.doctors, state.entities.shifts, syncEnabled]);

  return <StoreContext.Provider value={contextValue}>{children}</StoreContext.Provider>;
};

/* eslint-disable react-refresh/only-export-components -- useStore is the store public API */
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
