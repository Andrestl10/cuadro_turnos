import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode
} from 'react';
import type { AppState, ScheduleData, StoreAction, VersionedDoctor, VersionedShift } from './types';
import { v4 as uuidv4 } from 'uuid';
import { ScheduleService, toMonthKey } from '../services/ScheduleService';

const initialUIState = {
  currentMonth: new Date(),
  monthPublishedAt: null as number | null,
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
      return {
        ...state,
        ui: { ...state.ui, currentMonth: action.payload, monthPublishedAt: null }
      };
    }

    case 'SET_MONTH_PUBLISHED_AT': {
      return { ...state, ui: { ...state.ui, monthPublishedAt: action.payload } };
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
      const pa = action.payload.publishedAt;
      const monthPublishedAt =
        typeof pa === 'number' && Number.isFinite(pa) ? pa : null;
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
        ui: { ...state.ui, monthPublishedAt },
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

export type StoreContextValue = {
  state: AppState;
  dispatch: React.Dispatch<StoreAction>;
  /** Admin: persist month + template and set `publishedAt` so all roles see the official grid */
  publishCurrentMonth: () => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode; syncEnabled?: boolean }> = ({
  children,
  syncEnabled = true
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  /** Avoid saving seed/previous-month entities to the wrong RTDB path before hydrate completes */
  const hydratedMonthRef = useRef<string | null>(null);

  const monthKey = useMemo(() => toMonthKey(state.ui.currentMonth), [state.ui.currentMonth]);

  const publishCurrentMonth = useCallback(async () => {
    if (!syncEnabled) return;
    if (hydratedMonthRef.current !== monthKey) {
      window.alert('Espera a que termine de cargar el mes antes de publicar.');
      return;
    }
    const now = Date.now();
    const scheduleData: ScheduleData = {
      doctors: Object.values(state.entities.doctors),
      shifts: Object.values(state.entities.shifts),
      updatedAt: now,
      version: 1,
      publishedAt: now
    };
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
    try {
      await Promise.all([
        ScheduleService.saveDoctorTemplate(state.entities.doctors),
        ScheduleService.saveSchedule(monthKey, scheduleData)
      ]);
      dispatch({ type: 'SET_MONTH_PUBLISHED_AT', payload: now });
      dispatch({ type: 'SET_LAST_SYNC_AT', payload: now });
      dispatch({ type: 'CLEAR_PENDING_CHANGES' });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
      dispatch({ type: 'SET_SYNC_ERROR', payload: null });
      window.alert(
        'Cuadro publicado. Los turnos de este mes quedaron guardados en la nube y los pueden ver administradores y médicos.'
      );
    } catch (err) {
      console.warn('[StoreContext] publishCurrentMonth failed', err);
      dispatch({ type: 'SET_SYNC_ERROR', payload: (err as Error).message });
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      window.alert('No se pudo publicar. Revisa la conexión o vuelve a intentar.');
    }
  }, [syncEnabled, monthKey, state.entities.doctors, state.entities.shifts]);

  const contextValue = useMemo(
    () => ({ state, dispatch, publishCurrentMonth }),
    [state, dispatch, publishCurrentMonth]
  );

  // Load global doctors + month shifts (doctors: template wins, then legacy schedule.doctors)
  useEffect(() => {
    let cancelled = false;
    hydratedMonthRef.current = null;
    dispatch({ type: 'SET_SYNC_STATUS', payload: 'loading' });

    (async () => {
      try {
        const [template, remote] = await Promise.all([
          ScheduleService.loadDoctorTemplate().catch((err) => {
            console.warn('[StoreContext] loadDoctorTemplate failed', err);
            return null;
          }),
          ScheduleService.loadSchedule(monthKey).catch((err) => {
            console.warn('[StoreContext] loadSchedule failed', err);
            return null;
          })
        ]);
        if (cancelled) return;

        const hasTemplate = Boolean(template && Object.keys(template).length > 0);
        const hasRemote = remote !== null;

        if (!hasTemplate && !hasRemote) {
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
          return;
        }

        let doctors: VersionedDoctor[] = [];
        if (hasTemplate && template) {
          doctors = Object.values(template);
        } else if (remote?.doctors?.length) {
          doctors = remote.doctors;
        }

        const shifts = remote?.shifts ?? [];

        dispatch({
          type: 'HYDRATE_MONTH',
          payload: {
            doctors,
            shifts,
            publishedAt: remote?.publishedAt ?? null
          }
        });
        if (remote?.updatedAt) {
          dispatch({ type: 'SET_LAST_SYNC_AT', payload: remote.updatedAt });
        }
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
        dispatch({ type: 'SET_SYNC_ERROR', payload: null });
      } catch (err) {
        if (cancelled) return;
        console.warn('[StoreContext] month load failed', err);
        dispatch({ type: 'SET_SYNC_ERROR', payload: (err as Error).message });
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
      } finally {
        if (!cancelled) {
          hydratedMonthRef.current = monthKey;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  // Save template doctors + month schedule (admin only); debounced
  useEffect(() => {
    if (!syncEnabled) return;
    if (hydratedMonthRef.current !== monthKey) return;

    dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });

    const handle = globalThis.setTimeout(() => {
      const scheduleData: ScheduleData = {
        doctors: Object.values(state.entities.doctors),
        shifts: Object.values(state.entities.shifts),
        updatedAt: Date.now(),
        version: 1,
        publishedAt: state.ui.monthPublishedAt
      };

      Promise.all([
        ScheduleService.saveDoctorTemplate(state.entities.doctors),
        ScheduleService.saveSchedule(monthKey, scheduleData)
      ])
        .then(() => {
          dispatch({ type: 'SET_LAST_SYNC_AT', payload: Date.now() });
          dispatch({ type: 'CLEAR_PENDING_CHANGES' });
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
          dispatch({ type: 'SET_SYNC_ERROR', payload: null });
        })
        .catch((err) => {
          console.warn('[StoreContext] save failed', err);
          dispatch({ type: 'SET_SYNC_ERROR', payload: (err as Error).message });
          dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
        });
    }, 600);

    return () => {
      globalThis.clearTimeout(handle);
    };
  }, [monthKey, state.entities.doctors, state.entities.shifts, state.ui.monthPublishedAt, syncEnabled]);

  return <StoreContext.Provider value={contextValue}>{children}</StoreContext.Provider>;
};

/* eslint-disable react-refresh/only-export-components -- useStore is the store public API */
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
