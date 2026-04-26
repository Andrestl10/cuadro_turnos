import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { get, ref, set } from 'firebase/database';
import { firebaseAuth, firebaseDb } from '../firebase';

export type UserRole = 'admin' | 'doctor';

type UserProfile = {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: number;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function profilePath(uid: string) {
  if (!isNonEmptyString(uid)) throw new Error('uid must be a non-empty string');
  return `users/${uid}`;
}

function getBootstrapRole(email: string): UserRole {
  const adminsRaw: string | undefined = import.meta.env.VITE_ADMIN_EMAILS;
  if (!adminsRaw) return 'doctor';

  const adminEmails = adminsRaw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.trim().toLowerCase()) ? 'admin' : 'doctor';
}

async function ensureProfile(user: User): Promise<UserProfile> {
  const email = user.email ?? '';
  const snapshot = await get(ref(firebaseDb, profilePath(user.uid)));
  if (snapshot.exists()) return snapshot.val() as UserProfile;

  const role = getBootstrapRole(email);
  const profile: UserProfile = {
    uid: user.uid,
    email,
    role,
    createdAt: Date.now()
  };
  await set(ref(firebaseDb, profilePath(user.uid)), profile);
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const p = await ensureProfile(u);
        setProfile(p);
      } catch (err) {
        console.warn('Failed to load/create user profile', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      login: async (email, password) => {
        if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
          throw new Error('Email and password are required');
        }
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      },
      register: async (email, password) => {
        if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
          throw new Error('Email and password are required');
        }
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      },
      logout: async () => {
        await signOut(firebaseAuth);
      }
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
