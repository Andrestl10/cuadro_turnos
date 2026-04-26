import {
  ref,
  get,
  set,
  push,
  update,
  query,
  orderByChild,
  equalTo,
  type Database
} from 'firebase/database';
import type { Doctor, Shift } from '../types';

export type ScheduleDoc = {
  doctors: Doctor[];
  shifts: Shift[];
  updatedAt: number;
};

/**
 * RTDB payloads may be partial or legacy; never pass undefined arrays into React state.
 */
export function normalizeScheduleDoc(raw: unknown): ScheduleDoc | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const doctors = Array.isArray(o.doctors) ? (o.doctors as Doctor[]) : [];
  const shifts = Array.isArray(o.shifts) ? (o.shifts as Shift[]) : [];
  const updatedAt =
    typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt) ? o.updatedAt : Date.now();
  return { doctors, shifts, updatedAt };
}

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

export async function loadSchedule(db: Database, monthKey: string): Promise<ScheduleDoc | null> {
  const snapshot = await get(ref(db, schedulePath(monthKey)));
  if (!snapshot.exists()) return null;
  return normalizeScheduleDoc(snapshot.val());
}

export async function saveSchedule(db: Database, monthKey: string, data: Omit<ScheduleDoc, 'updatedAt'>) {
  const doctors = Array.isArray(data.doctors) ? data.doctors : [];
  const shifts = Array.isArray(data.shifts) ? data.shifts : [];
  await set(ref(db, schedulePath(monthKey)), { doctors, shifts, updatedAt: Date.now() });
}

export type RequestStatus = 'open' | 'reviewed' | 'approved' | 'rejected';

export type ChangeRequest = {
  id: string;
  uid: string;
  email: string;
  monthKey: string;
  message: string;
  dateStr?: string;
  status: RequestStatus;
  adminNote?: string;
  createdAt: number;
  updatedAt: number;
};

export function requestsPath(monthKey: string) {
  if (!isNonEmptyString(monthKey)) throw new Error('monthKey must be a non-empty string');
  return `requests/${monthKey}`;
}

export type LoadRequestsOptions = {
  role: 'admin' | 'doctor';
  uid?: string;
};

/**
 * Loads change requests for a month.
 * ASSUMPTION: RTDB rules allow admins to read the whole month node, while doctors
 * must query by `uid` (see database.rules.json).
 */
export async function loadRequests(
  db: Database,
  monthKey: string,
  options: LoadRequestsOptions
): Promise<ChangeRequest[]> {
  const baseRef = ref(db, requestsPath(monthKey));
  let snapshot;
  if (options.role === 'admin') {
    snapshot = await get(baseRef);
  } else {
    if (!options.uid) return [];
    snapshot = await get(query(baseRef, orderByChild('uid'), equalTo(options.uid)));
  }

  if (!snapshot.exists()) return [];
  const raw = snapshot.val() as Record<string, ChangeRequest>;
  return Object.entries(raw).map(([id, value]) => ({ ...value, id }));
}

export async function createRequest(
  db: Database,
  monthKey: string,
  data: Omit<ChangeRequest, 'id' | 'createdAt' | 'updatedAt' | 'monthKey' | 'status'>
) {
  const createdAt = Date.now();
  const newRef = push(ref(db, requestsPath(monthKey)));
  const request: Omit<ChangeRequest, 'id'> = {
    ...data,
    monthKey,
    status: 'open',
    createdAt,
    updatedAt: createdAt
  };
  await set(newRef, request);
  return newRef.key;
}

export async function updateRequestStatus(
  db: Database,
  monthKey: string,
  requestId: string,
  data: { status: RequestStatus; adminNote?: string }
) {
  if (!isNonEmptyString(requestId)) throw new Error('requestId must be a non-empty string');
  await update(ref(db, `${requestsPath(monthKey)}/${requestId}`), {
    status: data.status,
    adminNote: data.adminNote ?? null,
    updatedAt: Date.now()
  });
}

