import { ref, get, set, type Database } from 'firebase/database';
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

