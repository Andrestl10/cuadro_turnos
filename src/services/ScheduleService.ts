import { ref, get, set, onValue, type Unsubscribe } from 'firebase/database';
import type { Doctor, Shift } from '../types';
import type { VersionedDoctor, VersionedShift, ScheduleData, ConflictInfo } from '../store/types';
import { FirebaseService } from './FirebaseService';

/**
 * Schedule Service
 * Handles all schedule-related operations: load, save, watch, and conflict detection
 */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function toMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function schedulePath(monthKey: string): string {
  if (!isNonEmptyString(monthKey)) throw new Error('monthKey must be a non-empty string');
  return `schedules/${monthKey}`;
}

/**
 * Convert legacy array format to versioned format
 * For existing data without version info
 */
function addVersionIfMissing(doc: Doctor | Shift): VersionedDoctor | VersionedShift {
  const now = Date.now();
  const withMeta = doc as Doctor & { version?: number; lastModifiedAt?: number };
  return {
    ...doc,
    version: typeof withMeta.version === 'number' ? withMeta.version : 1,
    lastModifiedAt: typeof withMeta.lastModifiedAt === 'number' ? withMeta.lastModifiedAt : now
  } as VersionedDoctor | VersionedShift;
}

/**
 * Normalize schedule document with versioning
 */
export function normalizeScheduleDoc(raw: unknown): ScheduleData | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const rawDoctors = Array.isArray(o.doctors) ? (o.doctors as Doctor[]) : [];
  const rawShifts = Array.isArray(o.shifts) ? (o.shifts as Shift[]) : [];

  const doctors = rawDoctors.map(doc => addVersionIfMissing(doc) as VersionedDoctor);
  const shifts = rawShifts.map(shift => addVersionIfMissing(shift) as VersionedShift);

  const updatedAt = typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt)
    ? o.updatedAt
    : Date.now();

  const version = typeof o.version === 'number' ? o.version : 1;

  return { doctors, shifts, updatedAt, version };
}

export class ScheduleService {
  private static listeners: Map<string, Unsubscribe> = new Map();

  /**
   * Load schedule for a specific month
   */
  static async loadSchedule(monthKey: string): Promise<ScheduleData | null> {
    const db = FirebaseService.getDb();
    try {
      const snapshot = await get(ref(db, schedulePath(monthKey)));
      if (!snapshot.exists()) return null;
      return normalizeScheduleDoc(snapshot.val());
    } catch (error) {
      console.error('[ScheduleService] loadSchedule failed:', error);
      throw error;
    }
  }

  /**
   * Save schedule for a specific month
   */
  static async saveSchedule(monthKey: string, data: ScheduleData): Promise<void> {
    const db = FirebaseService.getDb();
    try {
      // Increment version on save
      const payload = {
        ...data,
        version: (data.version ?? 1) + 1,
        updatedAt: Date.now()
      };
      await set(ref(db, schedulePath(monthKey)), payload);
    } catch (error) {
      console.error('[ScheduleService] saveSchedule failed:', error);
      throw error;
    }
  }

  /**
   * Watch schedule in real-time and call callback on changes
   * Returns unsubscribe function
   */
  static watchSchedule(
    monthKey: string,
    onData: (data: ScheduleData) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    const db = FirebaseService.getDb();
    const path = schedulePath(monthKey);

    // Unsubscribe from previous listener if exists
    const previousListener = this.listeners.get(monthKey);
    if (previousListener) {
      previousListener();
    }

    const unsubscribe = onValue(
      ref(db, path),
      (snapshot) => {
        try {
          if (!snapshot.exists()) {
            onData({ doctors: [], shifts: [], updatedAt: Date.now(), version: 1 });
            return;
          }
          const data = normalizeScheduleDoc(snapshot.val());
          if (data) {
            onData(data);
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          onError?.(err);
        }
      },
      (error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[ScheduleService] watchSchedule error:', err);
        onError?.(err);
      }
    );

    // Store unsubscribe function
    this.listeners.set(monthKey, unsubscribe);

    // Return unsubscribe function
    return () => {
      unsubscribe();
      this.listeners.delete(monthKey);
    };
  }

  /**
   * Detect conflicts between local and remote data
   * Returns array of ConflictInfo for items with different versions or modification times
   */
  static detectConflicts(local: ScheduleData, remote: ScheduleData): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    // Check doctors for conflicts
    const allDoctorIds = new Set<string>();
    local.doctors.forEach(d => allDoctorIds.add(d.id));
    remote.doctors.forEach(d => allDoctorIds.add(d.id));

    allDoctorIds.forEach(id => {
      const localDoc = local.doctors.find(d => d.id === id);
      const remoteDoc = remote.doctors.find(d => d.id === id);

      // Only conflict if both exist and have different versions
      if (localDoc && remoteDoc && localDoc.version !== remoteDoc.version) {
        // Only report as conflict if remote is newer and local has unsaved changes
        // (we can assume local changes if remote is more recent)
        if (remoteDoc.lastModifiedAt > localDoc.lastModifiedAt) {
          conflicts.push({
            type: 'doctor',
            id,
            local: {
              value: localDoc,
              version: localDoc.version,
              lastModifiedAt: localDoc.lastModifiedAt
            },
            remote: {
              value: remoteDoc,
              version: remoteDoc.version,
              lastModifiedAt: remoteDoc.lastModifiedAt
            }
          });
        }
      }
    });

    // Check shifts for conflicts
    const allShiftIds = new Set<string>();
    local.shifts.forEach(s => allShiftIds.add(s.id));
    remote.shifts.forEach(s => allShiftIds.add(s.id));

    allShiftIds.forEach(id => {
      const localShift = local.shifts.find(s => s.id === id);
      const remoteShift = remote.shifts.find(s => s.id === id);

      if (localShift && remoteShift && localShift.version !== remoteShift.version) {
        if (remoteShift.lastModifiedAt > localShift.lastModifiedAt) {
          conflicts.push({
            type: 'shift',
            id,
            local: {
              value: localShift,
              version: localShift.version,
              lastModifiedAt: localShift.lastModifiedAt
            },
            remote: {
              value: remoteShift,
              version: remoteShift.version,
              lastModifiedAt: remoteShift.lastModifiedAt
            }
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Merge conflicting data using a strategy
   * Strategy: 'local' = keep local, 'remote' = use remote, 'merge' = merge changes
   */
  static mergeChanges(
    local: ScheduleData,
    remote: ScheduleData,
    strategy: 'local' | 'remote' | 'merge' = 'merge'
  ): ScheduleData {
    if (strategy === 'local') {
      return local;
    }

    if (strategy === 'remote') {
      return remote;
    }

    // Merge strategy: use latest version of each entity
    const doctorMap = new Map<string, VersionedDoctor>();
    const shiftMap = new Map<string, VersionedShift>();

    // Add all local doctors
    local.doctors.forEach(d => doctorMap.set(d.id, d));

    // Override with remote doctors if newer
    remote.doctors.forEach(d => {
      const local_d = doctorMap.get(d.id);
      if (!local_d || d.lastModifiedAt > local_d.lastModifiedAt) {
        doctorMap.set(d.id, d);
      }
    });

    // Add all local shifts
    local.shifts.forEach(s => shiftMap.set(s.id, s));

    // Override with remote shifts if newer
    remote.shifts.forEach(s => {
      const local_s = shiftMap.get(s.id);
      if (!local_s || s.lastModifiedAt > local_s.lastModifiedAt) {
        shiftMap.set(s.id, s);
      }
    });

    return {
      doctors: Array.from(doctorMap.values()),
      shifts: Array.from(shiftMap.values()),
      updatedAt: Date.now(),
      version: Math.max(local.version, remote.version) + 1
    };
  }

  /**
   * Clear all listeners
   */
  static clearAllListeners(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}
