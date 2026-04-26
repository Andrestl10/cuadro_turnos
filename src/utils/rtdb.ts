import { ref, get, set, push, update, type Database } from 'firebase/database';
import type { Doctor, Shift } from '../types';

export type ScheduleDoc = {
  doctors: Doctor[];
  shifts: Shift[];
  updatedAt: number;
};

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
  return snapshot.val() as ScheduleDoc;
}

export async function saveSchedule(db: Database, monthKey: string, data: Omit<ScheduleDoc, 'updatedAt'>) {
  await set(ref(db, schedulePath(monthKey)), { ...data, updatedAt: Date.now() });
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

export async function loadRequests(db: Database, monthKey: string): Promise<ChangeRequest[]> {
  const snapshot = await get(ref(db, requestsPath(monthKey)));
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

