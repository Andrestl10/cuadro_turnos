import React, { createContext, useContext, useState } from 'react';

export type Role = 'admin' | 'doctor';

interface AuthUser {
  username: string;
  role: Role;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  isAdmin: boolean;
}

// Hardcoded credentials — in a real app these would come from a backend
const USERS: Array<AuthUser & { password: string }> = [
  { username: 'admin', password: 'admin123', role: 'admin', displayName: 'Administrador' },
  { username: 'doctor', password: 'doctor123', role: 'doctor', displayName: 'Médico' },
];

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (username: string, password: string): { success: boolean; error?: string } => {
    const found = USERS.find(u => u.username === username && u.password === password);
    if (!found) {
      return { success: false, error: 'Usuario o contraseña incorrectos.' };
    }
    const authUser: AuthUser = { username: found.username, role: found.role, displayName: found.displayName };
    setUser(authUser);
    sessionStorage.setItem('auth_user', JSON.stringify(authUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
