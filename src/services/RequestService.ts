import {
  ref,
  get,
  push,
  set,
  update,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import type { ChangeRequest, RequestStatus } from '../utils/rtdb';
import { FirebaseService } from './FirebaseService';

/**
 * Request Service
 * Handles change requests/solicitudes from doctors to admins
 */

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function requestsPath(monthKey: string): string {
  if (!isNonEmptyString(monthKey)) throw new Error('monthKey must be a non-empty string');
  return `requests/${monthKey}`;
}

export type LoadRequestsOptions = {
  role: 'admin' | 'doctor';
  uid?: string;
};

export class RequestService {
  /**
   * Load requests for a month
   * Admins can see all requests, doctors see only their own
   */
  static async loadRequests(
    monthKey: string,
    options: LoadRequestsOptions
  ): Promise<ChangeRequest[]> {
    const db = FirebaseService.getDb();
    try {
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
    } catch (error) {
      console.error('[RequestService] loadRequests failed:', error);
      throw error;
    }
  }

  /**
   * Create a new request (doctors only)
   */
  static async createRequest(
    monthKey: string,
    data: Omit<ChangeRequest, 'id' | 'createdAt' | 'updatedAt' | 'monthKey' | 'status'>
  ): Promise<string> {
    const db = FirebaseService.getDb();
    try {
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
      return newRef.key!;
    } catch (error) {
      console.error('[RequestService] createRequest failed:', error);
      throw error;
    }
  }

  /**
   * Update request status and admin note (admins only)
   */
  static async updateRequestStatus(
    monthKey: string,
    requestId: string,
    data: { status: RequestStatus; adminNote?: string }
  ): Promise<void> {
    const db = FirebaseService.getDb();
    try {
      if (!isNonEmptyString(requestId)) throw new Error('requestId must be a non-empty string');
      await update(ref(db, `${requestsPath(monthKey)}/${requestId}`), {
        status: data.status,
        adminNote: data.adminNote ?? null,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('[RequestService] updateRequestStatus failed:', error);
      throw error;
    }
  }

  /**
   * Delete a request (admins only)
   */
  static async deleteRequest(monthKey: string, requestId: string): Promise<void> {
    const db = FirebaseService.getDb();
    try {
      if (!isNonEmptyString(requestId)) throw new Error('requestId must be a non-empty string');
      await set(ref(db, `${requestsPath(monthKey)}/${requestId}`), null);
    } catch (error) {
      console.error('[RequestService] deleteRequest failed:', error);
      throw error;
    }
  }
}
