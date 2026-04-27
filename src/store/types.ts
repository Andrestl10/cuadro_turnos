import type { Doctor, Shift } from '../types';

/** Versioned entities for conflict detection */
export interface VersionedDoctor extends Doctor {
  version: number;
  lastModifiedAt: number;
}

export interface VersionedShift extends Shift {
  version: number;
  lastModifiedAt: number;
}

/** Conflict information for resolution */
export interface ConflictInfo {
  type: 'doctor' | 'shift';
  id: string;
  local: {
    value: VersionedDoctor | VersionedShift;
    version: number;
    lastModifiedAt: number;
  };
  remote: {
    value: VersionedDoctor | VersionedShift;
    version: number;
    lastModifiedAt: number;
  };
}

/** Sync state for bidirectional synchronization */
export interface SyncState {
  status: 'idle' | 'loading' | 'syncing' | 'error';
  lastSyncAt: number;
  pendingChanges: Array<{
    type: 'add_doctor' | 'update_doctor' | 'remove_doctor' | 'add_shift' | 'update_shift' | 'remove_shift';
    id: string;
    timestamp: number;
  }>;
  conflictedItems: ConflictInfo[];
  lastError: string | null;
}

/** UI state for component interaction */
export interface UIState {
  currentMonth: Date;
  selectedDoctorId: string | null;
  isValidating: boolean;
  showConflictModal: boolean;
  offlineMode: boolean;
}

/** Normalized app state with Record-based entities */
export interface AppState {
  // Data: normalized entities
  entities: {
    doctors: Record<string, VersionedDoctor>;
    shifts: Record<string, VersionedShift>;
  };

  // UI state
  ui: UIState;

  // Sync state
  sync: SyncState;

  // Undo/Redo history
  past: Array<{
    doctors: Record<string, VersionedDoctor>;
    shifts: Record<string, VersionedShift>;
  }>;
  future: Array<{
    doctors: Record<string, VersionedDoctor>;
    shifts: Record<string, VersionedShift>;
  }>;
}

/** Data transfer format for backend operations */
export interface ScheduleData {
  doctors: VersionedDoctor[];
  shifts: VersionedShift[];
  updatedAt: number;
  version: number;
}

/** Union type for reducer actions */
export type StoreAction =
  // Doctors
  | { type: 'ADD_DOCTOR'; payload: Omit<Doctor, 'id'> }
  | { type: 'UPDATE_DOCTOR'; payload: VersionedDoctor }
  | { type: 'REMOVE_DOCTOR'; payload: string }
  
  // Shifts
  | { type: 'ADD_SHIFT'; payload: Omit<Shift, 'id'> }
  | { type: 'ADD_SHIFTS'; payload: Array<Omit<Shift, 'id'>> }
  | { type: 'UPDATE_SHIFT'; payload: VersionedShift }
  | { type: 'REMOVE_SHIFT'; payload: string }
  
  // UI
  | { type: 'SET_MONTH'; payload: Date }
  | { type: 'SET_SELECTED_DOCTOR'; payload: string | null }
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_OFFLINE_MODE'; payload: boolean }
  
  // Sync & Loading
  | { type: 'HYDRATE_MONTH'; payload: { doctors: VersionedDoctor[]; shifts: VersionedShift[] } }
  | { type: 'SET_SYNC_STATUS'; payload: SyncState['status'] }
  | { type: 'ADD_PENDING_CHANGE'; payload: SyncState['pendingChanges'][0] }
  | { type: 'CLEAR_PENDING_CHANGES' }
  | { type: 'SET_CONFLICTS'; payload: ConflictInfo[] }
  | { type: 'SHOW_CONFLICT_MODAL'; payload: boolean }
  | { type: 'SET_LAST_SYNC_AT'; payload: number }
  | { type: 'SET_SYNC_ERROR'; payload: string | null }
  
  // History
  | { type: 'UNDO' }
  | { type: 'REDO' };
