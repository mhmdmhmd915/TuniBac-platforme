import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import api, { authAPI } from '../services/api';
import type { BacSection } from '../constants/bacSections';

export type EducationTrack = 'BAC' | 'OTHER';

interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName: string;
  lastName: string;
  bacSection: BacSection | null;
  educationTrack: EducationTrack;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VALID_TRACKS: readonly EducationTrack[] = ['BAC', 'OTHER'];

function isEducationTrack(value: unknown): value is EducationTrack {
  return typeof value === 'string' && VALID_TRACKS.includes(value as EducationTrack);
}

function warnMissingTrack(rawShape: Record<string, unknown>) {
  if (import.meta.env.PROD) return;
  try {
    const role = typeof rawShape?.role === 'string' ? rawShape.role : undefined;
    const status = typeof rawShape?.status === 'string' ? rawShape.status : undefined;
    const track = rawShape?.educationTrack;
    // eslint-disable-next-line no-console
    console.warn(
      '[AuthContext] Missing or invalid educationTrack for user. Falling back to BAC. ' +
        `(role=${String(role ?? '?')}, status=${String(status ?? '?')}, received=${String(track ?? 'undefined')})`,
    );
  } catch {
    /* swallow */
  }
}

function normalizeUser(raw: any): User {
  if (!raw || typeof raw !== 'object') return raw as User;
  const rawTrack = raw.educationTrack;
  if (isEducationTrack(rawTrack)) {
    return raw as User;
  }
  if (
    typeof raw.role === 'string' &&
    raw.role !== 'ADMIN' &&
    raw.role !== 'TEACHER' &&
    typeof raw.status === 'string'
  ) {
    warnMissingTrack(raw);
  }
  return { ...raw, educationTrack: 'BAC' as const } satisfies User as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await authAPI.getCurrentUser();
          setUser(normalizeUser(response.data.user));
          setToken(storedToken);
        } catch (error) {
          // Token invalid or expired
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common['Authorization'];
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    const normalized = normalizeUser(newUser);
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(normalized);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
