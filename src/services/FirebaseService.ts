import { firebaseDb, firebaseAuth } from '../firebase';

/**
 * Centralized Firebase service
 * Provides access to db and auth instances
 */

export class FirebaseService {
  static getDb() {
    return firebaseDb;
  }

  static getAuth() {
    return firebaseAuth;
  }

  static getCurrentUser() {
    return firebaseAuth.currentUser;
  }

  static async getCurrentUserId(): Promise<string | null> {
    return new Promise((resolve) => {
      const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user?.uid ?? null);
      });
    });
  }
}
